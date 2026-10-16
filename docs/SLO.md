# Service-level objectives

These objectives apply only after the public production deployment begins recording external observations. They are targets, not claims about results that have not yet been measured.

## Service boundary

The service is available when `GET /api/health/ready` returns HTTP 200 with `status: ready`. Availability includes cold starts and platform failures visible to a public client. Planned maintenance is included so deployment quality remains measurable.

The service stores no user data, so there is no durability objective. The bundled fixtures and evaluation report are versioned with the release image.

## Initial objectives

Measured over a rolling 30-day window:

- Availability: at least 99.5% of external readiness checks succeed.
- Error rate: fewer than 1% of application requests return HTTP 5xx.
- Warm latency: 95% of successful `/api/summary` requests complete within 750 ms.
- Deployment recovery: a failed release is rolled back to the previous verified digest within 15 minutes.

At 99.5% availability, the monthly error budget is approximately 3 hours and 36 minutes. A production claim must include the observed measurement window and may not substitute a local test result for deployed availability.

## Alerts and response

Investigate when any of these conditions occurs:

- Three consecutive external readiness checks fail.
- The five-minute HTTP 5xx rate exceeds 1%.
- Warm p95 latency exceeds 750 ms for 15 minutes.
- A new revision fails its post-deployment smoke test.

For a release-related incident, stop further deployments, capture the failing revision and request IDs, redeploy the previous known-good digest, verify readiness, and record the result in `DEPLOYMENT_LOG.md`.

## Evidence required before reporting results

- Production URL and immutable image digest
- Start and end of the measurement window
- Number and frequency of readiness observations
- Availability, error-rate, and latency results
- Links or screenshots from Azure monitoring
- Any incidents, exclusions, and rollback exercises
