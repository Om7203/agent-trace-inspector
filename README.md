# Agent Trace Inspector

Agent Trace Inspector is a model-independent evaluation and debugging tool for AI-agent execution traces. It checks explicit contracts around tool selection, argument schemas, approval boundaries, structured results, evidence references, and final outcomes.

It requires no GPU, model download, API key, or cloud account. The bundled dataset contains transparent hand-authored scenarios, including intentional failures. It does **not** claim to measure model intelligence or semantic answer quality.

## Why this exists

Agent demos often show only successful conversations. This project keeps failure cases visible and repeatable. A trace can pass or fail individual checks, making it easier to identify whether a problem came from tool choice, malformed arguments, missing approval, fabricated evidence, or an incorrect outcome.

## Run it

Node.js 20 or newer is required. There are no production dependencies.

```bash
npm test
npm run evaluate
npm start
```

Open `http://127.0.0.1:3100` to inspect the dashboard.

Operational release checks can target a running local or remote service:

```bash
npm run smoke -- https://service.example
npm run load:test -- https://service.example
```

With Docker:

```bash
docker build -t agent-trace-inspector .
docker run --rm -p 3100:3100 agent-trace-inspector
```

## Current evaluation

The initial suite contains 16 traces: 10 valid executions and 6 intentionally broken executions. The failing traces demonstrate missing approval, hallucinated tools, invalid arguments, unsupported claims, fabricated evidence references, and incorrect outcome reporting.

Run `npm run evaluate` to regenerate [`docs/evaluation.json`](docs/evaluation.json). The report records check-level results and labels its methodology so the fixture score cannot reasonably be presented as a model benchmark.

## Trace contract

Each trace records:

- The user request and scenario provenance
- Tools available to the agent, including risk level and argument schema
- The expected tool sequence and outcome
- Actual calls, arguments, approvals, and tool results
- Claims mapped to explicit paths in tool results
- The observed outcome and final response

The evaluator currently performs deterministic structural checks. Evidence-path validation proves only that a referenced value exists; it does not prove that a natural-language claim is entailed by that value.

## API

- `GET /api/health` — process and fixture status
- `GET /api/health/live` — liveness probe
- `GET /api/health/ready` — readiness probe
- `GET /api/traces` — traces plus their evaluation
- `GET /api/summary` — evaluation report
- `POST /api/evaluate` — evaluate one trace, limited to 200 KB

## Project boundaries

- No bundled trace is presented as real model output.
- No private prompts, user files, credentials, or company data are included.
- No arbitrary code or submitted tool call is executed.
- The evaluator checks declared contracts, not general AI safety.
- The local server is not an authenticated multi-user service.

## Roadmap

1. Publish a JSON Schema for portable trace exchange.
2. Add privacy-clean trace exporters for Support Agent Lab and Goffy.
3. Add sequence-level recovery and latency checks.
4. Add optional adapters for real model runs when suitable compute or API access is available.
5. Publish a static portfolio case study with versioned evaluation results.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data flow and design decisions.

## Delivery and operating status

GitHub Actions verifies Node.js 20 and 22, checks the generated report for drift, audits dependencies, builds and scans the container, compiles the Azure infrastructure, exercises smoke and load gates, and runs CodeQL. Semantic-version tags publish an SBOM- and provenance-attested image to GitHub Container Registry.

The Azure deployment path uses Bicep, GitHub OIDC, protected staging and production environments, immutable image digests, Container Apps health probes, Log Analytics, and an external scheduled monitor.

This remains a **release-ready learning project**, not a production service, until the real deployment and operating evidence exists. [`docs/PRODUCTION_READINESS.md`](docs/PRODUCTION_READINESS.md) is the claim gate. [`docs/OPERATIONS.md`](docs/OPERATIONS.md) covers release and rollback procedures, while [`SECURITY.md`](SECURITY.md) records security boundaries and limitations.
