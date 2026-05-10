#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { findLatestPptxArtifact, inspectPptxFile, validatePptxSmokeResult } from '../src/qc/pptx-structural-smoke.mjs';

const usage = [
  'pptx-structural-smoke --pptx <path> | --exports-dir <dir> [--expected-slides <n>]'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = (tokens) => {
  const options = {};
  const flagMap = new Map([
    ['--pptx', 'pptxPath'],
    ['--exports-dir', 'exportsDir'],
    ['--expected-slides', 'expectedSlides']
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

  if (!options.pptxPath) {
    if (!options.exportsDir) {
      fail('Missing required option: --pptx or --exports-dir.');
    }
  }

  if (options.pptxPath && options.exportsDir) {
    fail('Pass only one of --pptx or --exports-dir.');
  }

  if (options.expectedSlides !== undefined) {
    const expectedSlides = Number(options.expectedSlides);
    if (!Number.isInteger(expectedSlides) || expectedSlides < 1) {
      fail('--expected-slides must be a positive integer.');
    }
    options.expectedSlides = expectedSlides;
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
let pptxPath;
if (options.pptxPath) {
  pptxPath = path.resolve(options.pptxPath);
  if (!existsSync(pptxPath)) {
    fail(`PPTX file not found: ${pptxPath}`);
  }
} else {
  const exportsDir = path.resolve(options.exportsDir);
  try {
    pptxPath = findLatestPptxArtifact(exportsDir);
  } catch (error) {
    fail(error.message);
  }
}

const summary = inspectPptxFile(pptxPath);
const validation = validatePptxSmokeResult(summary, {
  expectedSlides: options.expectedSlides
});

process.stdout.write(`${JSON.stringify({ ...summary, ...validation }, null, 2)}\n`);
if (!validation.ok) {
  process.exitCode = 1;
}
