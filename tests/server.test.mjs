import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/server.mjs';

async function request(path) {
  let status;
  let headers;
  let body = '';
  const response = { writeHead(value, values) { status = value; headers = values; }, end(value = '') { body += value; } };
  await handleRequest({ method: 'GET', url: path, headers: { host: 'localhost' } }, response);
  return { status, headers, body: JSON.parse(body) };
}

test('serves health and evaluation API responses', async () => {
  const health = await request('/api/health');
  const summary = await request('/api/summary');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok', traces: 16 });
  assert.match(health.headers['x-request-id'], /^[0-9a-f-]{36}$/);
  assert.equal(health.headers['x-frame-options'], 'DENY');
  assert.equal(summary.body.summary.total, 16);
});

test('reports readiness after loading the fixture suite', async () => {
  const readiness = await request('/api/health/ready');
  assert.deepEqual(readiness.body, { status: 'ready', fixtureSuite: 'loaded', traces: 16 });
});
