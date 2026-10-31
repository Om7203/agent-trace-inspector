import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { validateTraceDocument } from '../src/trace-schema.mjs';

const traces = JSON.parse(await readFile(new URL('../data/traces.json', import.meta.url), 'utf8'));

test('validates the bundled portable trace suite', () => {
  const result = validateTraceDocument(traces);
  assert.equal(result.valid, true);
  assert.equal(result.count, 16);
  assert.deepEqual(result.errors, []);
});

test('accepts a single portable trace document', () => {
  const result = validateTraceDocument(traces[0]);
  assert.equal(result.valid, true);
  assert.equal(result.count, 1);
});

test('reports bounded paths for malformed external traces', () => {
  const malformed = structuredClone(traces[0]);
  delete malformed.request;
  delete malformed.execution.calls[0].result;

  const result = validateTraceDocument(malformed);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.path === '/request'));
  assert.ok(result.errors.some(error => error.path.endsWith('/result')));
});

test('rejects an empty trace collection', () => {
  const result = validateTraceDocument([]);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].keyword, 'minItems');
});

test('CLI validates a trace file and supports JSON output', () => {
  const run = spawnSync(process.execPath, ['src/validate-trace.mjs', '--json', 'data/traces.json'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.valid, true);
  assert.equal(result.count, 16);
});
