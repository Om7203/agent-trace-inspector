import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { get } from 'node:http';
import { createApp, handleRequest } from '../src/server.mjs';

async function request(path) {
  let status;
  let headers;
  let body = '';
  const response = { writeHead(value, values) { status = value; headers = values; }, end(value = '') { body += value; } };
  await handleRequest({ method: 'GET', url: path, headers: { host: 'localhost' } }, response);
  return { status, headers, body: JSON.parse(body) };
}

function liveRequest(port, path) {
  return new Promise((resolve, reject) => {
    const request = get({ host: '127.0.0.1', port, path }, async response => {
      let body = '';
      for await (const chunk of response) body += chunk;
      resolve({ status: response.statusCode, headers: response.headers, body });
    });
    request.on('error', reject);
  });
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

test('reports the deployed service identity', async () => {
  const version = await request('/api/version');
  assert.deepEqual(version.body, {
    service: 'agent-trace-inspector',
    environment: 'local',
    version: 'development'
  });
});

test('emits structured request logs with correlation and timing fields', async () => {
  const lines = [];
  const server = createApp({ log: line => lines.push(line) });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    const response = await liveRequest(address.port, '/api/health?source=test');
    const requestId = response.headers['x-request-id'];
    assert.equal(response.status, 200);
    await new Promise(resolve => setImmediate(resolve));

    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, 'info');
    assert.equal(entry.event, 'http_request_completed');
    assert.equal(entry.service, 'agent-trace-inspector');
    assert.equal(entry.environment, 'local');
    assert.equal(entry.version, 'development');
    assert.equal(entry.requestId, requestId);
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/api/health');
    assert.equal(entry.statusCode, 200);
    assert.equal(typeof entry.durationMs, 'number');
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('configures bounded HTTP server timeouts', () => {
  const server = createApp({ log: () => {} });
  assert.equal(server.requestTimeout, 15_000);
  assert.equal(server.headersTimeout, 10_000);
  assert.equal(server.keepAliveTimeout, 5_000);
  server.close();
});

test('returns retry metadata when evaluation requests are rate limited', async () => {
  let status;
  let headers;
  let body = '';
  const response = {
    writeHead(value, values) { status = value; headers = values; },
    end(value = '') { body += value; }
  };
  const request = {
    method: 'POST',
    url: '/api/evaluate',
    headers: { host: 'localhost', 'x-forwarded-for': '192.0.2.1' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  const resetAt = Date.now() + 30_000;
  const rateLimiter = {
    check: () => ({ allowed: false, limit: 30, remaining: 0, resetAt })
  };

  await handleRequest(request, response, { rateLimiter, requestId: 'test-request' });
  assert.equal(status, 429);
  assert.equal(headers['ratelimit-limit'], '30');
  assert.equal(headers['ratelimit-remaining'], '0');
  assert.match(headers['retry-after'], /^([1-9]|[12][0-9]|30)$/);
  assert.deepEqual(JSON.parse(body), { error: 'Evaluation request limit exceeded.' });
});
