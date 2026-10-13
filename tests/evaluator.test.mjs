import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateSuite, evaluateTrace } from '../src/evaluator.mjs';

const traces = JSON.parse(await readFile(new URL('../data/traces.json', import.meta.url), 'utf8'));

test('evaluates the full fixture suite and preserves intentional failures', () => {
  const report = evaluateSuite(traces);
  assert.equal(report.summary.total, 16);
  assert.equal(report.summary.passed, 10);
  assert.equal(report.summary.failed, 6);
});

test('accepts a correct automatic tool call with grounded claims', () => {
  const result = evaluateTrace(traces.find(trace => trace.id === 'time-success'));
  assert.equal(result.passed, true);
  assert.equal(result.score, 100);
});

test('detects execution of a confirm-risk tool without approval', () => {
  const result = evaluateTrace(traces.find(trace => trace.id === 'url-without-approval'));
  assert.equal(result.passed, false);
  assert.equal(result.checks.find(item => item.id === 'approval').passed, false);
});

test('detects unknown evidence references', () => {
  const result = evaluateTrace(traces.find(trace => trace.id === 'fabricated-citation'));
  assert.equal(result.checks.find(item => item.id === 'evidence').passed, false);
});

test('returns a bounded structural failure for malformed input', () => {
  const result = evaluateTrace({ id: 'broken' });
  assert.equal(result.passed, false);
  assert.equal(result.checks[0].id, 'structure');
});
