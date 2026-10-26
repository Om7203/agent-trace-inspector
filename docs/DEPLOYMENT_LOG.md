# Deployment and rollback log

Record real events only. Do not pre-fill results or describe a check as passed until its output has been reviewed.

## Production deployment — 2026-10-25

- Environment: Cloudflare Workers production
- UTC timestamp: 2026-10-25 21:57
- Git commit: `8c1dcf26432c8ba7b9f53805dc3e3ff2a5b4ffdd`
- Worker release: `v0.1.0`
- Application URL: <https://agent-trace-inspector.omvaghasiya2003.workers.dev>
- Deployment run: <https://github.com/Om7203/agent-trace-inspector/actions/runs/40237905367>
- CI run: <https://github.com/Om7203/agent-trace-inspector/actions/runs/40237668352>
- CodeQL run: <https://github.com/Om7203/agent-trace-inspector/actions/runs/40237668370>
- Smoke-test result: passed against production; 16 traces, environment `production`, version `v0.1.0`
- Load-check result: not run against the public free-tier service; no capacity claim is made
- Previous known-good commit: `f4557544413eed160204da3d5fb7c456e1dd2356`
- Operator notes: Worker deployment uses platform versioning rather than a container digest.

## Production rollback exercise — 2026-10-26

- Environment: Cloudflare Workers production
- Starting commit: `6a7149c0468ad9d5abb66a30babda6b56e661ce2`
- Rollback commit: `f4557544413eed160204da3d5fb7c456e1dd2356`
- Reason for exercise: validate the guarded previous-main revision path and recovery procedure
- Time rollback started: 2026-10-26 10:44 UTC
- Time rollback workflow completed: 2026-10-26 10:45 UTC
- Workflow duration: 40 seconds
- Rolled-back readiness: HTTP 200, `status: ready`, 16 traces
- Version evidence: `/api/version` returned HTTP 404, proving the pre-endpoint revision was active
- Rollback run: <https://github.com/Om7203/agent-trace-inspector/actions/runs/40309781418>
- Roll-forward run: <https://github.com/Om7203/agent-trace-inspector/actions/runs/40310139123>
- Roll-forward duration: 47 seconds
- Restored smoke test: passed; environment `production`, version `v0.1.0`, 16 traces
- First monitored observation: <https://github.com/Om7203/agent-trace-inspector/actions/runs/40310366990>
- Monitor artifact: `production-observation-40310366990`, SHA-256 `023ab6ef767810179c16fa6f19f5e027645b58ce0ae1ac3684beb2e2b32c171e`
- Unexpected behavior: none
- Follow-up work: review availability, errors, and latency after the 14-day observation window

## Deployment record template

- Environment:
- UTC timestamp:
- Git commit:
- Container digest:
- Azure deployment name:
- Application URL:
- CI run:
- Smoke-test result:
- Load-check result:
- Previous known-good digest:
- Operator notes:

## Rollback exercise template

- UTC timestamp:
- Environment:
- Starting digest:
- Rollback digest:
- Reason for exercise:
- Time rollback started:
- Time readiness recovered:
- Recovery duration:
- Evidence links:
- Unexpected behavior:
- Follow-up work:
