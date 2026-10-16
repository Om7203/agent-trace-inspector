import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixedWindowRateLimiter, rateLimitConfig } from '../src/rate-limit.mjs';

test('limits requests independently by client key', () => {
  const limiter = createFixedWindowRateLimiter({ maxRequests: 2, windowMs: 1000, now: () => 100 });
  assert.deepEqual(limiter.check('client-a'), { allowed: true, limit: 2, remaining: 1, resetAt: 1100 });
  assert.deepEqual(limiter.check('client-a'), { allowed: true, limit: 2, remaining: 0, resetAt: 1100 });
  assert.deepEqual(limiter.check('client-a'), { allowed: false, limit: 2, remaining: 0, resetAt: 1100 });
  assert.equal(limiter.check('client-b').allowed, true);
});

test('opens a new window after the reset time', () => {
  let timestamp = 100;
  const limiter = createFixedWindowRateLimiter({ maxRequests: 1, windowMs: 1000, now: () => timestamp });
  assert.equal(limiter.check('client').allowed, true);
  assert.equal(limiter.check('client').allowed, false);
  timestamp = 1100;
  assert.deepEqual(limiter.check('client'), { allowed: true, limit: 1, remaining: 0, resetAt: 2100 });
});

test('uses safe defaults for invalid environment configuration', () => {
  assert.deepEqual(rateLimitConfig({ RATE_LIMIT_MAX_REQUESTS: 'zero', RATE_LIMIT_WINDOW_MS: '-1' }), {
    maxRequests: 30,
    windowMs: 60_000
  });
});
