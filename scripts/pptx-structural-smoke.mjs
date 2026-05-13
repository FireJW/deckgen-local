#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  findLatestPptxArtifact,
  findLatestPptxArtifactForRunDir,
  inferExpectedSlidesForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from '../src/qc/pptx-structural-smoke.mjs';

const usage = [
  'pptx-structural-smoke --pptx <path> | --exports-dir <dir> | --run-dir <dir> [--expected-slides <n>] [--expected-text <text> ...]'
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
    ['--run-dir', 'runDir'],
    ['--expected-slides', 'expectedSlides'],
    ['--expected-text', 'expectedText']
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

    if (key === 'expectedText') {
      options.expectedText = [...(options.expectedText ?? []), value];
    } else {
      options[key] = value;
    }
  }

  const targetCount = [options.pptxPath, options.exportsDir, options.runDir]
    .filter((value) => value !== undefined).length;
  if (targetCount === 0) {
    fail('Missing required option: --pptx, --exports-dir, or --run-dir.');
  }

  if (targetCount > 1) {
    fail('Pass only one of --pptx, --exports-dir, or --run-dir.');
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
  try {
    pptxPath = options.exportsDir
      ? findLatestPptxArtifact(path.resolve(options.exportsDir))
      : findLatestPptxArtifactForRunDir(path.resolve(options.runDir));
  } catch (error) {
    fail(error.message);
  }
}

const summary = inspectPptxFile(pptxPath);
const expectedSlides = options.expectedSlides ?? (
  options.runDir ? inferExpectedSlidesForRunDir(path.resolve(options.runDir)) : undefined
);
const validation = validatePptxSmokeResult(summary, {
  expectedSlides,
  expectedText: options.expectedText
});

process.stdout.write(`${JSON.stringify({ ...summary, expectedSlides, expectedText: options.expectedText, ...validation }, null, 2)}\n`);
if (!validation.ok) {
  process.exitCode = 1;
}
