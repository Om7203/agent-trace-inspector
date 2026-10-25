import { evaluateSuite, evaluateTrace } from './evaluator.mjs';

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function securityHeaders(requestId) {
  return {
    'x-request-id': requestId,
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'strict-transport-security': 'max-age=31536000',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
  };
}

function json(value, status, requestId, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...securityHeaders(requestId), ...jsonHeaders, ...headers }
  });
}

async function readJson(request) {
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > 200_000) throw new Error('Request body exceeds 200 KB.');
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 200_000) {
    throw new Error('Request body exceeds 200 KB.');
  }
  return JSON.parse(body);
}

function withSecurityHeaders(response, requestId) {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(securityHeaders(requestId))) {
    secured.headers.set(name, value);
  }
  return secured;
}

export function createWorkerHandler({
  traces,
  assets,
  checkRateLimit = async () => null,
  log = console.log,
  serviceEnvironment = 'local',
  serviceVersion = 'development'
}) {
  if (!Array.isArray(traces)) throw new TypeError('traces must be an array');

  return async function handle(request) {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const startedAt = performance.now();
    const url = new URL(request.url);
    let response;

    try {
      if (request.method === 'GET' && ['/api/health', '/api/health/live'].includes(url.pathname)) {
        response = json({ status: 'ok', traces: traces.length }, 200, requestId);
      } else if (request.method === 'GET' && url.pathname === '/api/health/ready') {
        response = json({ status: 'ready', fixtureSuite: 'loaded', traces: traces.length }, 200, requestId);
      } else if (request.method === 'GET' && url.pathname === '/api/traces') {
        response = json({ traces, evaluation: evaluateSuite(traces) }, 200, requestId);
      } else if (request.method === 'GET' && url.pathname === '/api/summary') {
        response = json(evaluateSuite(traces), 200, requestId);
      } else if (request.method === 'POST' && url.pathname === '/api/evaluate') {
        const rate = await checkRateLimit(request);
        if (rate && !rate.allowed) {
          response = json({ error: 'Evaluation request limit exceeded.' }, 429, requestId, {
            'ratelimit-limit': String(rate.limit),
            'ratelimit-remaining': String(rate.remaining),
            'ratelimit-reset': String(Math.ceil(rate.resetAt / 1000)),
            'retry-after': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)))
          });
        } else {
          try {
            response = json(evaluateTrace(await readJson(request)), 200, requestId);
          } catch (error) {
            response = json({ error: error instanceof Error ? error.message : 'Invalid request body.' }, 400, requestId);
          }
        }
      } else if (request.method !== 'GET') {
        response = json({ error: 'Method not allowed.' }, 405, requestId);
      } else if (assets) {
        response = withSecurityHeaders(await assets.fetch(request), requestId);
      } else {
        response = json({ error: 'Not found.' }, 404, requestId);
      }
    } catch (error) {
      response = json({ error: 'Internal server error.' }, 500, requestId);
      log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        event: 'http_request_failed',
        service: 'agent-trace-inspector',
        environment: serviceEnvironment,
        version: serviceVersion,
        requestId,
        method: request.method,
        path: url.pathname,
        error: error instanceof Error ? error.message : 'Unknown request error'
      }));
    }

    log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'http_request_completed',
      service: 'agent-trace-inspector',
      environment: serviceEnvironment,
      version: serviceVersion,
      requestId,
      method: request.method,
      path: url.pathname,
      statusCode: response.status,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100
    }));
    return response;
  };
}
