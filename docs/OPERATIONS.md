# Operations and release guide

## Service checks

- `/api/health/live` confirms that the Node process can answer HTTP requests.
- `/api/health/ready` confirms that the fixture suite loaded and evaluation can be served.
- Each response includes an `X-Request-ID` for correlation.

The current service does not persist user data. A restart reloads the versioned fixtures from the container image.

## CI pipeline

Every push and pull request runs:

1. Syntax checks on Node.js 20 and 22
2. Unit and API-handler tests
3. Evaluation-report regeneration and drift detection
4. Production dependency audit
5. Docker image build
6. CodeQL analysis on `main`, pull requests, and weekly

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
