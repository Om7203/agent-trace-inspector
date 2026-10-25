import assert from 'node:assert/strict';

const baseUrl = new URL(process.argv[2] || process.env.TARGET_URL || 'http://127.0.0.1:3100');

async function getJson(path) {
  const response = await fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  assert.match(response.headers.get('x-request-id') || '', /^[0-9a-f-]{36}$/i, `${path} has no request ID`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  return response.json();
}

const live = await getJson('/api/health/live');
assert.equal(live.status, 'ok');

const ready = await getJson('/api/health/ready');
assert.equal(ready.status, 'ready');
assert.equal(ready.fixtureSuite, 'loaded');

const version = await getJson('/api/version');
assert.equal(version.service, 'agent-trace-inspector');
assert.equal(typeof version.environment, 'string');
assert.ok(version.environment.length > 0);
assert.equal(typeof version.version, 'string');
assert.ok(version.version.length > 0);

const summary = await getJson('/api/summary');
assert.equal(summary.summary.total, ready.traces);
assert.equal(typeof summary.summary.passRate, 'number');

console.log(JSON.stringify({
  check: 'smoke',
  status: 'passed',
  target: baseUrl.origin,
  traces: ready.traces,
  environment: version.environment,
  version: version.version
}));
