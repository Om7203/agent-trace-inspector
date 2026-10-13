# Contributing

## Local verification

1. Use Node.js 20 or 22.
2. Run `npm ci --ignore-scripts`.
3. Run `npm run check`.
4. If Docker Desktop is running, build with `docker build -t agent-trace-inspector:local .`.

## Change expectations

- Keep traces free of credentials, personal information, private prompts, and company data.
- State trace provenance directly.
- Add an intentionally failing fixture when introducing a new evaluator rule.
- Keep generated `docs/evaluation.json` synchronized with the fixture suite.
- Avoid claims that deterministic checks prove semantic accuracy or production safety.
- Use focused commits that describe one coherent change.
