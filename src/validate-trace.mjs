import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateTraceDocument } from './trace-schema.mjs';

function usage() {
  return 'Usage: node src/validate-trace.mjs [--json] <trace-file.json>';
}

export async function main(args = process.argv.slice(2), io = console) {
  const jsonOutput = args.includes('--json');
  const paths = args.filter(argument => argument !== '--json');
  if (paths.length !== 1 || paths[0] === '--help' || paths[0] === '-h') {
    io.error(usage());
    return paths.length === 1 ? 0 : 2;
  }

  const file = paths[0];
  let document;
  try {
    document = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    const result = {
      valid: false,
      file,
      errors: [{ path: '/', message: error instanceof Error ? error.message : 'Unable to read trace document.' }]
    };
    (jsonOutput ? io.log : io.error)(jsonOutput ? JSON.stringify(result, null, 2) : `Unable to validate ${file}: ${result.errors[0].message}`);
    return 2;
  }

  const result = { file, ...validateTraceDocument(document) };
  if (jsonOutput) {
    io.log(JSON.stringify(result, null, 2));
  } else if (result.valid) {
    io.log(`Valid trace document: ${result.count} trace${result.count === 1 ? '' : 's'} in ${file}.`);
  } else {
    io.error(`Invalid trace document: ${result.errors.length} issue${result.errors.length === 1 ? '' : 's'} in ${file}.`);
    result.errors.forEach(error => io.error(`- trace[${error.trace}] ${error.path} ${error.message}`));
  }
  return result.valid ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
