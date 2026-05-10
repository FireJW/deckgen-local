#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  findLatestPptxArtifact,
  findLatestPptxArtifactForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from '../src/qc/pptx-structural-smoke.mjs';
import {
  defaultPptxScreenshotPath,
  exportFirstSlideWithPowerPoint
} from '../src/qc/pptx-visual-smoke.mjs';

const usage = [
  'pptx-visual-smoke --pptx <path> | --exports-dir <dir> | --run-dir <dir>',
  '                  [--screenshot-out <path>] [--expected-slides <n>]',
  '                  [--powerpoint-executable <path>]'
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
    ['--screenshot-out', 'screenshotOut'],
    ['--expected-slides', 'expectedSlides'],
    ['--powerpoint-executable', 'powerPointPath']
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

const resolvePptxPath = (options) => {
  if (options.pptxPath) {
    const pptxPath = path.resolve(options.pptxPath);
    if (!existsSync(pptxPath)) {
      fail(`PPTX file not found: ${pptxPath}`);
    }
    return pptxPath;
  }

  try {
    return options.exportsDir
      ? findLatestPptxArtifact(path.resolve(options.exportsDir))
      : findLatestPptxArtifactForRunDir(path.resolve(options.runDir));
  } catch (error) {
    fail(error.message);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const pptxPath = resolvePptxPath(options);
  const structural = inspectPptxFile(pptxPath);
  const structuralValidation = validatePptxSmokeResult(structural, {
    expectedSlides: options.expectedSlides
  });
  if (!structuralValidation.ok) {
    process.stdout.write(`${JSON.stringify({ ...structural, ...structuralValidation }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  const screenshotPath = path.resolve(options.screenshotOut ?? defaultPptxScreenshotPath(pptxPath));
  try {
    const visual = exportFirstSlideWithPowerPoint({
      pptxPath,
      screenshotPath,
      powerPointPath: options.powerPointPath
    });
    process.stdout.write(`${JSON.stringify({ ...structural, ...structuralValidation, ...visual }, null, 2)}\n`);
  } catch (error) {
    fail(error.message);
  }
};

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
