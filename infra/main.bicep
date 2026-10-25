targetScope = 'subscription'

@description('Deployment stage used to isolate resource names and settings.')
@allowed([
  'staging'
  'production'
])
param environmentName string

@description('Azure region for the resource group and Container Apps environment.')
param location string = 'westeurope'

@description('Immutable container reference. Production deployments should use an image digest.')
param image string

@description('Minimum replicas kept ready for requests.')
@minValue(0)
@maxValue(3)
param minReplicas int = environmentName == 'production' ? 1 : 0

@description('Maximum replicas allowed during traffic spikes.')
@minValue(1)
@maxValue(5)
param maxReplicas int = 2

var suffix = uniqueString(subscription().id, environmentName)
var stageCode = environmentName == 'production' ? 'prod' : 'stg'
var resourceGroupName = 'rg-agent-trace-${environmentName}'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: {
    application: 'agent-trace-inspector'
    environment: environmentName
    managedBy: 'bicep'
  }
}

module service './modules/service.bicep' = {
  name: 'agent-trace-${environmentName}'
  scope: resourceGroup
  params: {
    appName: 'ati-${stageCode}-${suffix}'
    environmentName: environmentName
    image: image
    location: location
    logWorkspaceName: 'log-ati-${stageCode}-${suffix}'
    managedEnvironmentName: 'cae-ati-${stageCode}-${suffix}'
    maxReplicas: maxReplicas
    minReplicas: minReplicas
    serviceVersion: image
  }
}

output applicationName string = service.outputs.applicationName
output applicationUrl string = 'https://${service.outputs.fqdn}'
output readinessUrl string = 'https://${service.outputs.fqdn}/api/health/ready'
output resourceGroupName string = resourceGroup.name
