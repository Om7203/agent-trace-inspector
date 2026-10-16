# Azure deployment

The Bicep template deploys Agent Trace Inspector to Azure Container Apps with separate staging or production resources. It creates a resource group, Log Analytics workspace, Container Apps environment, HTTPS ingress, liveness and readiness probes, and bounded HTTP autoscaling.

## Deployment boundary

- Deployments accept only an immutable GHCR image digest.
- GitHub authenticates to Azure with OpenID Connect; no long-lived Azure password is stored.
- The `staging` and `production` GitHub environments hold their own Azure identifiers and protection rules.
- Staging defaults to zero minimum replicas. Production defaults to one ready replica and can therefore create ongoing Azure charges.
- The service is public and must not receive private or confidential traces.

## Required GitHub configuration

Create `staging` and `production` environments in the GitHub repository. Define these environment variables in both:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Configure the Azure identity with one federated credential for each GitHub environment. Grant it only the subscription or resource-group permissions required to deploy these templates. Add required reviewers to the `production` GitHub environment so a deployment cannot bypass human approval.

## Release flow

1. Publish and verify a semantic-version container through the release workflow.
2. Copy the resulting `ghcr.io/...@sha256:...` reference.
3. Run the `Deploy` workflow for `staging`.
4. Verify staging behavior and telemetry.
5. Run the same workflow with the same digest for `production`.
6. Record the deployment and previous known-good digest in the operations log.

Do not deploy the mutable `latest` tag. Rollback means redeploying the previously verified digest through the same workflow.
