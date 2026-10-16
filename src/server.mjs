import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { evaluateSuite, evaluateTrace } from './evaluator.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = join(root, 'public');
const traces = JSON.parse(await readFile(join(root, 'data', 'traces.json'), 'utf8'));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3100);
const serviceEnvironment = process.env.SERVICE_ENVIRONMENT || 'local';
const serviceVersion = process.env.SERVICE_VERSION || 'development';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

function structuredLog(log, level, event, fields = {}) {
  log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'agent-trace-inspector',
    environment: serviceEnvironment,
    version: serviceVersion,
    ...fields
  }));
}

function baseHeaders(requestId) {
  return {
    'x-request-id': requestId,
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
}

function sendJson(response, status, value, requestId) {
  response.writeHead(status, { ...baseHeaders(requestId), 'content-type': mime['.json'], 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 200_000) throw new Error('Request body exceeds 200 KB.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveStatic(pathname, response, requestId) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const candidate = normalize(join(publicRoot, relative));
  if (!candidate.startsWith(`${publicRoot}${sep}`)) return sendJson(response, 403, { error: 'Path is outside the public directory.' }, requestId);
  try {
    const content = await readFile(candidate);
    response.writeHead(200, { ...baseHeaders(requestId), 'content-type': mime[extname(candidate)] || 'application/octet-stream', 'cache-control': 'public, max-age=300' });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: 'Not found.' }, requestId);
  }
}

export async function handleRequest(request, response, options = {}) {
  const requestId = options.requestId || randomUUID();
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && ['/api/health', '/api/health/live'].includes(url.pathname)) return sendJson(response, 200, { status: 'ok', traces: traces.length }, requestId);
  if (request.method === 'GET' && url.pathname === '/api/health/ready') return sendJson(response, 200, { status: 'ready', fixtureSuite: 'loaded', traces: traces.length }, requestId);
  if (request.method === 'GET' && url.pathname === '/api/traces') return sendJson(response, 200, { traces, evaluation: evaluateSuite(traces) }, requestId);
  if (request.method === 'GET' && url.pathname === '/api/summary') return sendJson(response, 200, evaluateSuite(traces), requestId);
  if (request.method === 'POST' && url.pathname === '/api/evaluate') {
    try {
      return sendJson(response, 200, evaluateTrace(await readBody(request)), requestId);
    } catch (error) {
      return sendJson(response, 400, { error: error.message }, requestId);
    }
  }
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' }, requestId);
  return serveStatic(url.pathname, response, requestId);
}

export function createApp(options = {}) {
  const log = options.log || console.log;
  const server = createServer(async (request, response) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    const pathname = request.url?.split('?', 1)[0] || '/';

    response.once('finish', () => {
      structuredLog(log, 'info', 'http_request_completed', {
        requestId,
        method: request.method,
        path: pathname,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100
      });
    });

    try {
      await handleRequest(request, response, { requestId });
    } catch (error) {
      structuredLog(log, 'error', 'http_request_failed', {
        requestId,
        method: request.method,
        path: pathname,
        error: error instanceof Error ? error.message : 'Unknown request error'
      });
      if (!response.headersSent) {
        sendJson(response, 500, { error: 'Internal server error.' }, requestId);
      } else {
        response.destroy();
      }
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createApp().listen(port, host, () => {
    structuredLog(console.log, 'info', 'service_started', { host, port });
  });
  const shutdown = signal => {
    structuredLog(console.log, 'info', 'service_stopping', { signal });
    server.close(error => process.exit(error ? 1 : 0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
