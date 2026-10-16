@description('Name of the Azure Container App.')
param appName string

@description('Deployment stage attached to resource tags and environment variables.')
param environmentName string

@description('Immutable container image reference to deploy.')
param image string

@description('Azure region for all resources in this module.')
param location string

@description('Name of the Log Analytics workspace.')
param logWorkspaceName string

@description('Name of the Azure Container Apps managed environment.')
param managedEnvironmentName string

@minValue(0)
param minReplicas int

@minValue(1)
param maxReplicas int

resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logWorkspaceName
  location: location
  tags: {
    application: 'agent-trace-inspector'
    environment: environmentName
    managedBy: 'bicep'
  }
  properties: {
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: managedEnvironmentName
  location: location
  tags: {
    application: 'agent-trace-inspector'
    environment: environmentName
    managedBy: 'bicep'
  }
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspace.properties.customerId
        sharedKey: logWorkspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
  }
}

resource application 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  tags: {
    application: 'agent-trace-inspector'
    environment: environmentName
    managedBy: 'bicep'
  }
  properties: {
    environmentId: managedEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        allowInsecure: false
        external: true
        targetPort: 3100
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'agent-trace-inspector'
          image: image
          env: [
            {
              name: 'HOST'
              value: '0.0.0.0'
            }
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3100'
            }
            {
              name: 'SERVICE_ENVIRONMENT'
              value: environmentName
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health/live'
                port: 3100
                scheme: 'HTTP'
              }
              failureThreshold: 3
              initialDelaySeconds: 10
              periodSeconds: 30
              timeoutSeconds: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health/ready'
                port: 3100
                scheme: 'HTTP'
              }
              failureThreshold: 3
              initialDelaySeconds: 5
              periodSeconds: 10
              successThreshold: 1
              timeoutSeconds: 3
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-requests'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

output applicationName string = application.name
output fqdn string = application.properties.configuration.ingress.fqdn
