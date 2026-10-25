import traces from '../data/traces.json' with { type: 'json' };
import { createWorkerHandler } from './worker-handler.mjs';

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export class RateLimiter {
  constructor(state, env) {
    this.state = state;
    this.limit = positiveInteger(env.RATE_LIMIT_MAX, DEFAULT_LIMIT);
    this.windowMs = positiveInteger(env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS);
  }

  async fetch() {
    const now = Date.now();
    const result = await this.state.storage.transaction(async storage => {
      const current = await storage.get(['count', 'resetAt']);
      const previousReset = current.get('resetAt');
      const resetAt = typeof previousReset === 'number' && previousReset > now
        ? previousReset
        : now + this.windowMs;
      const previousCount = resetAt === previousReset ? current.get('count') : 0;
      const count = (typeof previousCount === 'number' ? previousCount : 0) + 1;
      await storage.put({ count, resetAt });
      return {
        allowed: count <= this.limit,
        limit: this.limit,
        remaining: Math.max(0, this.limit - count),
        resetAt
      };
    });
    return Response.json(result);
  }
}

async function rateLimitCheck(request, env) {
  const key = request.headers.get('cf-connecting-ip') || 'unknown';
  const id = env.RATE_LIMITERS.idFromName(key);
  const response = await env.RATE_LIMITERS.get(id)
    .fetch('https://rate-limit.internal/check', { method: 'POST' });
  return response.json();
}

export default {
  fetch(request, env) {
    const handle = createWorkerHandler({
      traces,
      assets: env.ASSETS,
      checkRateLimit: candidate => rateLimitCheck(candidate, env),
      serviceEnvironment: env.SERVICE_ENVIRONMENT,
      serviceVersion: env.SERVICE_VERSION
    });
    return handle(request);
  }
};
