#!/usr/bin/env node
import path from 'node:path';
import {
  inspectDeckRunBundle,
  validateDeckRunBundleSmokeResult
} from '../src/qc/run-bundle-smoke.mjs';

const usage = 'deck-run-smoke --run-dir <deckgen-run-dir>';

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = (tokens) => {
  const options = {};

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];

    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    if (flag !== '--run-dir') {
      fail(`Unsupported option: ${flag ?? ''}`);
    }

    if (value === undefined || value.startsWith('--')) {
      fail('Missing value for --run-dir.');
    }

    options.runDir = value;
  }

  if (!options.runDir) {
    fail('Missing required option: --run-dir.');
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
const summary = inspectDeckRunBundle({ runDir: path.resolve(options.runDir) });
const validation = validateDeckRunBundleSmokeResult(summary);

process.stdout.write(`${JSON.stringify({ ...summary, ...validation }, null, 2)}\n`);
if (!validation.ok) {
  process.exitCode = 1;
}
