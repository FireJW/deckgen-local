#!/usr/bin/env node
import { buildGuizangPreflightResult } from '../src/integrations/guizang-ppt-skill.mjs';

const usage = 'guizang-source-preflight --source <path>';

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = (tokens) => {
  const options = {};
  const flagMap = new Map([
    ['--source', 'source']
  ]);

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];

    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    if (!flag?.startsWith('--')) {
      fail(`Unexpected argument: ${flag ?? ''}`);
    }

    if (value === undefined || value.startsWith('--')) {
      fail(`Missing value for ${flag}.`);
    }

    const key = flagMap.get(flag);
    if (!key) {
      fail(`Unsupported option: ${flag}`);
    }

    options[key] = value;
  }

  if (!options.source) {
    fail('Missing required option: --source.');
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
const result = buildGuizangPreflightResult(options.source);

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) {
  process.exitCode = 1;
}
