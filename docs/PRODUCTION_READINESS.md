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

- [ ] All CI jobs pass on the production-deployment changes.
- [ ] The container builds in GitHub Actions.
- [ ] Trivy reports no unfixed policy-blocking high or critical vulnerability.
- [ ] CodeQL passes.
- [ ] A semantic-version image is published with an SBOM and provenance attestation.

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

- [ ] A rollback to a previous digest is performed and timed.
- [ ] The deployment and rollback log contains real evidence links.
- [ ] Availability, error rate, and latency are observed for at least 14 days.
- [ ] Any incident during the observation window is recorded with follow-up work.
- [ ] The measured results meet or explicitly revise the objectives in `SLO.md`.

## Claim boundary

Before all deployment and operating gates are complete, describe the project as using production-oriented engineering practices.

After the gates are complete, it is accurate to say that the maintainer deployed and operated a production-style personal service with CI/CD, infrastructure as code, observability, service objectives, security scanning, and tested rollback. This does not imply experience operating a large enterprise or safety-critical production platform.
