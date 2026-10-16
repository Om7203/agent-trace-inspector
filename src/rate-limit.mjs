function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function rateLimitConfig(environment = process.env) {
  return {
    maxRequests: positiveInteger(environment.RATE_LIMIT_MAX_REQUESTS, 30),
    windowMs: positiveInteger(environment.RATE_LIMIT_WINDOW_MS, 60_000)
  };
}

export function createFixedWindowRateLimiter(options = {}) {
  const maxRequests = positiveInteger(options.maxRequests, 30);
  const windowMs = positiveInteger(options.windowMs, 60_000);
  const now = options.now || Date.now;
  const clients = new Map();
  let checks = 0;

  function prune(timestamp) {
    for (const [key, value] of clients) {
      if (timestamp >= value.resetAt) clients.delete(key);
    }
  }

  return {
    check(key = 'unknown') {
      const timestamp = now();
      checks += 1;
      if (checks % 100 === 0) prune(timestamp);

      let current = clients.get(key);
      if (!current || timestamp >= current.resetAt) {
        current = { count: 0, resetAt: timestamp + windowMs };
      }
      current.count += 1;
      clients.set(key, current);

      return {
        allowed: current.count <= maxRequests,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - current.count),
        resetAt: current.resetAt
      };
    }
  };
}
