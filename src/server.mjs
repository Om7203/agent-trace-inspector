import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSuite, evaluateTrace } from './evaluator.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = join(root, 'public');
const traces = JSON.parse(await readFile(join(root, 'data', 'traces.json'), 'utf8'));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3100);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

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

export async function handleRequest(request, response) {
  const requestId = randomUUID();
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

export function createApp() {
  return createServer(handleRequest);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createApp().listen(port, host, () => console.log(`Agent Trace Inspector running at http://${host}:${port}`));
  const shutdown = signal => {
    console.log(`${signal} received; closing HTTP server.`);
    server.close(error => process.exit(error ? 1 : 0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
