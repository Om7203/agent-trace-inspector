# Deployment and rollback log

Record real events only. Do not pre-fill results or describe a check as passed until its output has been reviewed.

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
