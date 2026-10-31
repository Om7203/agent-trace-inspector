import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';

const schemaUrl = new URL('../schemas/agent-trace.schema.json', import.meta.url);
export const traceSchema = JSON.parse(await readFile(schemaUrl, 'utf8'));

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateTrace = ajv.compile(traceSchema);

function formatError(error, index) {
  const missing = error.keyword === 'required' ? `/${error.params.missingProperty}` : '';
  return {
    trace: index,
    path: `${error.instancePath || ''}${missing}` || '/',
    keyword: error.keyword,
    message: error.message || 'is invalid'
  };
}

export function validateTraceDocument(document) {
  const traces = Array.isArray(document) ? document : [document];
  if (traces.length === 0) {
    return {
      valid: false,
      count: 0,
      errors: [{ trace: null, path: '/', keyword: 'minItems', message: 'must contain at least one trace' }]
    };
  }

  const errors = [];
  traces.forEach((trace, index) => {
    if (!validateTrace(trace)) {
      errors.push(...(validateTrace.errors || []).map(error => formatError(error, index)));
    }
  });

  return { valid: errors.length === 0, count: traces.length, errors };
}
