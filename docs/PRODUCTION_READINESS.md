# Production readiness evidence

Production readiness is an evidence decision, not a repository label. Update this page only when the corresponding output, deployment, or operating record exists.

## Verified in a clean local environment

- [x] Unit and HTTP-handler tests pass on the supported runtime.
- [x] Structured access logs include environment, release, request ID, status, and duration.
- [x] Liveness and readiness endpoints are distinct and covered by tests.
- [x] HTTP timeouts, request-size bounds, security headers, graceful shutdown, and evaluation rate limits are implemented.
- [x] Azure Bicep infrastructure compiles with the official compiler.
- [x] GitHub workflows pass `actionlint`.
- [x] Local smoke and controlled load checks pass.
- [x] Delivery actions and workflow containers are pinned to immutable revisions or digests.

Local load results demonstrate that the release gate works. They are not evidence of cloud capacity or production latency.

## Requires publication and GitHub evidence

- [x] All CI jobs pass on the production-deployment changes.
- [x] The container builds in GitHub Actions.
- [x] Trivy reports no unfixed policy-blocking high or critical vulnerability.
- [x] CodeQL passes.
- [ ] A semantic-version image is published with an SBOM and provenance attestation.

## Cloudflare production deployment

- [x] Staging and production use separate Worker environments.
- [x] Distributed rate limiting is enforced by a Durable Object.
- [x] The verified revision deploys to production over HTTPS.
- [x] Post-deployment smoke checks verify readiness, security headers, traces, environment, and version.
- [x] `PRODUCTION_URL` is configured and the 15-minute external monitor retains observation artifacts.
- [x] A guarded rollback accepts only previous commits from `main`.
- [x] A production rollback and roll-forward were performed and timed.
- [x] The deployment and rollback log contains real workflow and artifact evidence.

## Requires an Azure subscription

- [ ] GitHub OIDC identities are configured separately for staging and production.
- [ ] Production requires a human approval through a protected GitHub environment.
- [ ] The immutable image digest deploys successfully to staging.
- [ ] Staging readiness, smoke, and controlled load checks pass.
- [ ] The same digest deploys successfully to production over HTTPS.
- [ ] `PRODUCTION_URL` is configured and the external monitor is running.
- [ ] Azure Log Analytics receives structured application logs.
- [ ] Azure cost alerts or budget controls are configured in the subscription.

## Requires operating evidence

- [x] A rollback to a previous release is performed and timed.
- [x] The deployment and rollback log contains real evidence links.
- [ ] Availability, error rate, and latency are observed for at least 14 days.
- [ ] Any incident during the observation window is recorded with follow-up work.
- [ ] The measured results meet or explicitly revise the objectives in `SLO.md`.

## Claim boundary

Before all deployment and operating gates are complete, describe the project as using production-oriented engineering practices.

After the gates are complete, it is accurate to say that the maintainer deployed and operated a production-style personal service with CI/CD, infrastructure as code, observability, service objectives, security scanning, and tested rollback. This does not imply experience operating a large enterprise or safety-critical production platform.
