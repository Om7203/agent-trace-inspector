import { readFile, writeFile } from 'node:fs/promises';
import { evaluateSuite } from './evaluator.mjs';

const traces = JSON.parse(await readFile(new URL('../data/traces.json', import.meta.url), 'utf8'));
const report = evaluateSuite(traces);
await writeFile(new URL('../docs/evaluation.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Evaluated ${report.summary.total} traces: ${report.summary.passed} passed, ${report.summary.failed} intentionally exposed failures.`);
