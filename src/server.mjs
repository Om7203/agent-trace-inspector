import { createServer } from 'node:http';
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

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': mime['.json'], 'cache-control': 'no-store' });
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

async function serveStatic(pathname, response) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const candidate = normalize(join(publicRoot, relative));
  if (!candidate.startsWith(`${publicRoot}${sep}`)) return sendJson(response, 403, { error: 'Path is outside the public directory.' });
  try {
    const content = await readFile(candidate);
    response.writeHead(200, { 'content-type': mime[extname(candidate)] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: 'Not found.' });
  }
}

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok', traces: traces.length });
  if (request.method === 'GET' && url.pathname === '/api/traces') return sendJson(response, 200, { traces, evaluation: evaluateSuite(traces) });
  if (request.method === 'GET' && url.pathname === '/api/summary') return sendJson(response, 200, evaluateSuite(traces));
  if (request.method === 'POST' && url.pathname === '/api/evaluate') {
    try {
      return sendJson(response, 200, evaluateTrace(await readBody(request)));
    } catch (error) {
      return sendJson(response, 400, { error: error.message });
    }
  }
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' });
  return serveStatic(url.pathname, response);
}

export function createApp() {
  return createServer(handleRequest);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createApp().listen(port, host, () => console.log(`Agent Trace Inspector running at http://${host}:${port}`));
}
