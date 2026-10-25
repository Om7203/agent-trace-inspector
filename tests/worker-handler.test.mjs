import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createWorkerHandler } from '../src/worker-handler.mjs';

const traces = JSON.parse(await readFile(new URL('../data/traces.json', import.meta.url), 'utf8'));

function createHandler(options = {}) {
  return createWorkerHandler({ traces, log: () => {}, ...options });
}

test('serves health and evaluation responses through the Fetch API', async () => {
  const handle = createHandler();
  const health = await handle(new Request('https://example.test/api/health'));
  const evaluation = await handle(new Request('https://example.test/api/evaluate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(traces[0])
  }));

  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', traces: 16 });
  assert.match(health.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(evaluation.status, 200);
  assert.equal((await evaluation.json()).id, traces[0].id);
});

test('serves static assets through the configured asset binding', async () => {
  const requested = [];
  const handle = createHandler({
    assets: { fetch(request) { requested.push(request.url); return new Response('asset', { status: 200 }); } }
  });
  const response = await handle(new Request('https://example.test/app.js'));

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset');
  assert.deepEqual(requested, ['https://example.test/app.js']);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('enforces body bounds and a platform rate-limit decision', async () => {
  const limited = createHandler({
    checkRateLimit: async () => ({ allowed: false, limit: 30, remaining: 0, resetAt: Date.now() + 10_000 })
  });
  const limitedResponse = await limited(new Request('https://example.test/api/evaluate', { method: 'POST', body: '{}' }));
  assert.equal(limitedResponse.status, 429);
  assert.equal(limitedResponse.headers.get('ratelimit-limit'), '30');

  const handle = createHandler();
  const oversized = await handle(new Request('https://example.test/api/evaluate', {
    method: 'POST',
    body: 'x'.repeat(200_001)
  }));
  assert.equal(oversized.status, 400);
  assert.deepEqual(await oversized.json(), { error: 'Request body exceeds 200 KB.' });
});

test('emits structured completion logs', async () => {
  const lines = [];
  const handle = createWorkerHandler({ traces, log: line => lines.push(JSON.parse(line)) });
  const response = await handle(new Request('https://example.test/api/health'));

  assert.equal(response.status, 200);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].event, 'http_request_completed');
  assert.equal(lines[0].statusCode, 200);
  assert.equal(lines[0].path, '/api/health');
  assert.equal(typeof lines[0].durationMs, 'number');
});
