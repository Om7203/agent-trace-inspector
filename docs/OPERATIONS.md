# Operations and release guide

## Service checks

- `/api/health/live` confirms that the Node process can answer HTTP requests.
- `/api/health/ready` confirms that the fixture suite loaded and evaluation can be served.
- Each response includes an `X-Request-ID` for correlation.

The current service does not persist user data. A restart reloads the versioned fixtures from the container image.

Application logs are emitted as single-line JSON and include the deployment environment, immutable release reference, request ID, method, path, status, and duration. Query the Container Apps console logs through the deployment's Log Analytics workspace and use request IDs to correlate failures.

## Reliability checks

- `npm run smoke -- https://service.example` verifies liveness, readiness, evaluation summary, request IDs, and security headers.
- `npm run load:test -- https://service.example` sends a controlled warm workload and fails when errors exceed 1% or p95 latency exceeds 750 ms.
- Load settings can be changed with `LOAD_REQUESTS`, `LOAD_CONCURRENCY`, `LOAD_MAX_ERROR_RATE`, and `LOAD_MAX_P95_MS`.

The default load check is a release gate, not a capacity benchmark. Record production measurements and operating events in `DEPLOYMENT_LOG.md`. Objectives and evidence requirements are defined in `SLO.md`.

## CI pipeline

Every push and pull request runs:

1. Syntax checks on Node.js 20 and 22
2. Unit and API-handler tests
3. Evaluation-report regeneration and drift detection
4. Production dependency audit
5. Docker image build
6. High and critical container vulnerability scan
7. CodeQL analysis on `main`, pull requests, and weekly

The generated evaluation report is retained as a workflow artifact on Node.js 22.

## Release pipeline

A semantic version tag such as `v0.1.0` starts the release workflow. It builds the container, publishes versioned and `latest` images to GitHub Container Registry, attaches an SBOM, and records build provenance.

Creating a tag is an external release action. Do it only after CI is green and the release checklist below is complete.

## Release checklist

- [ ] `npm ci --ignore-scripts` succeeds from a clean checkout
- [ ] `npm run check` passes
- [ ] Docker image builds and its health check becomes healthy
- [ ] Dashboard is visually checked on desktop and mobile widths
- [ ] Fixture provenance and expected failures are reviewed
- [ ] `SECURITY.md` still describes the deployed boundary
- [ ] Rollback target is identified as the previous container tag
- [ ] Release notes describe changes and known limits
- [ ] Staging smoke and load checks pass against the immutable release digest
- [ ] Production monitoring and rollback records identify the deployed digest

## Rollback

Container releases are immutable by digest. Roll back by deploying the previously verified semantic-version tag. Do not rely on `latest` as a rollback reference.

## What remains before a production claim

The repository is designed to be release-ready, not declared production-ready. A public production deployment would still need:

- Authentication if private traces are accepted
- Distributed rate limiting
- Centralized structured logs and metrics
- Availability and latency objectives measured under real traffic
- Backup and incident procedures if persistence is added
- Deployment-specific TLS, network, and secret management
- A tested rollback in the selected hosting platform
