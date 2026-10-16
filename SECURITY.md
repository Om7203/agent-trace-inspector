# Security policy

## Supported version

Security fixes are applied to the current `main` branch and the latest tagged release.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting feature when it is enabled for the repository. Include the affected route or component, reproduction steps, expected impact, and any suggested mitigation.

## Current security boundaries

- Submitted traces are parsed as data and never executed.
- Request bodies are limited to 200 KB.
- Public evaluation requests are protected by a bounded per-instance rate limit.
- Static files are restricted to the public directory.
- Responses include a restrictive Content Security Policy and other browser security headers.
- The container runs as the unprivileged `node` user.
- The service has no authentication and should not be used for private traces on a public deployment.
- Rate limits are maintained in process and are not a distributed security boundary. The service has no durable audit log.

These boundaries reduce risk but do not make the service suitable for sensitive or multi-tenant workloads.
