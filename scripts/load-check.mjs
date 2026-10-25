import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(sorted, value) {
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)];
}

const baseUrl = new URL(process.argv[2] || process.env.TARGET_URL || 'http://127.0.0.1:3100');
const totalRequests = positiveInteger(process.env.LOAD_REQUESTS, 100);
const concurrency = Math.min(totalRequests, positiveInteger(process.env.LOAD_CONCURRENCY, 10));
const maxP95Ms = positiveNumber(process.env.LOAD_MAX_P95_MS, 750);
const maxErrorRate = positiveNumber(process.env.LOAD_MAX_ERROR_RATE, 0.01);
const durations = [];
const errors = [];
let nextRequest = 0;

async function executeRequest(index) {
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL('/api/summary', baseUrl), {
      headers: { 'user-agent': 'agent-trace-load-check/1.0' },
      signal: AbortSignal.timeout(10_000)
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.summary?.total, 'number');
  } catch (error) {
    errors.push({ request: index + 1, error: error.message });
  } finally {
    durations.push(performance.now() - startedAt);
  }
}

async function worker() {
  while (nextRequest < totalRequests) {
    const index = nextRequest;
    nextRequest += 1;
    await executeRequest(index);
  }
}

await fetch(new URL('/api/health/ready', baseUrl), { signal: AbortSignal.timeout(10_000) });
const startedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker()));
const elapsedMs = performance.now() - startedAt;
const sorted = durations.toSorted((left, right) => left - right);
const errorRate = errors.length / totalRequests;
const report = {
  check: 'load',
  status: errorRate <= maxErrorRate && percentile(sorted, 0.95) <= maxP95Ms ? 'passed' : 'failed',
  target: baseUrl.origin,
  requests: totalRequests,
  concurrency,
  errors: errors.length,
  errorRate,
  requestsPerSecond: Math.round((totalRequests / elapsedMs) * 100_000) / 100,
  latencyMs: {
    p50: Math.round(percentile(sorted, 0.5) * 100) / 100,
    p95: Math.round(percentile(sorted, 0.95) * 100) / 100,
    p99: Math.round(percentile(sorted, 0.99) * 100) / 100
  },
  thresholds: { maxErrorRate, maxP95Ms }
};

console.log(JSON.stringify(report, null, 2));
if (errors[0]) console.error(`First request error: ${errors[0].error}`);
if (report.status !== 'passed') process.exitCode = 1;
