import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/server.mjs';

async function request(path) {
  let status;
  let body = '';
  const response = { writeHead(value) { status = value; }, end(value = '') { body += value; } };
  await handleRequest({ method: 'GET', url: path, headers: { host: 'localhost' } }, response);
  return { status, body: JSON.parse(body) };
}

test('serves health and evaluation API responses', async () => {
  const health = await request('/api/health');
  const summary = await request('/api/summary');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok', traces: 16 });
  assert.equal(summary.body.summary.total, 16);
});
