import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { RateLimiter } from '../src/worker.mjs';

function memoryStorage() {
  const values = new Map();
  return {
    async transaction(callback) {
      return callback({
        async get(keys) { return new Map(keys.map(key => [key, values.get(key)])); },
        async put(entries) { for (const [key, value] of Object.entries(entries)) values.set(key, value); }
      });
    }
  };
}

test('the durable object applies a strict fixed-window limit', async () => {
  const limiter = new RateLimiter({ storage: memoryStorage() }, {
    RATE_LIMIT_MAX: '2',
    RATE_LIMIT_WINDOW_MS: '60000'
  });

  assert.equal((await limiter.fetch()).status, 200);
  const second = await (await limiter.fetch()).json();
  const third = await (await limiter.fetch()).json();
  assert.deepEqual(second, { allowed: true, limit: 2, remaining: 0, resetAt: second.resetAt });
  assert.equal(third.allowed, false);
  assert.equal(third.remaining, 0);
});

test('the worker delegates evaluation limits by client address', async () => {
  const names = [];
  const env = {
    SERVICE_ENVIRONMENT: 'test',
    SERVICE_VERSION: 'test-version',
    ASSETS: { fetch: () => new Response('asset') },
    RATE_LIMITERS: {
      idFromName(name) { names.push(name); return name; },
      get() {
        return {
          fetch: () => Response.json({ allowed: false, limit: 30, remaining: 0, resetAt: Date.now() + 60_000 })
        };
      }
    }
  };

  const response = await worker.fetch(new Request('https://example.test/api/evaluate', {
    method: 'POST',
    headers: { 'cf-connecting-ip': '192.0.2.10' },
    body: '{}'
  }), env);

  assert.equal(response.status, 429);
  assert.deepEqual(names, ['192.0.2.10']);
});
