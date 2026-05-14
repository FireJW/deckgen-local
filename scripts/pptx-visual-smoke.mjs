#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  findLatestPptxArtifact,
  findLatestPptxArtifactForRunDir,
  inferExpectedSlidesForRunDir,
  inferExpectedTextForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from '../src/qc/pptx-structural-smoke.mjs';
import {
  buildPptxVisualSmokeFailure,
  defaultPptxScreenshotPath,
  exportFirstSlideWithPowerPoint,
  exportSlidesWithPowerPoint
} from '../src/qc/pptx-visual-smoke.mjs';

const usage = [
  'pptx-visual-smoke --pptx <path> | --exports-dir <dir> | --run-dir <dir>',
  '                  [--screenshot-out <path>] [--expected-slides <n>]',
  '                  [--expected-text <text> ...] [--expected-text-from-contract]',
  '                  [--slide <n> | --all-slides] [--powerpoint-executable <path>]'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const writeRuntimeFailure = (error, context = {}) => {
  process.stdout.write(`${JSON.stringify(buildPptxVisualSmokeFailure(error, context), null, 2)}\n`);
  process.exitCode = 1;
};

const parseArgs = (tokens) => {
  const options = {};
  const flagMap = new Map([
    ['--pptx', 'pptxPath'],
    ['--exports-dir', 'exportsDir'],
    ['--run-dir', 'runDir'],
    ['--screenshot-out', 'screenshotOut'],
    ['--expected-slides', 'expectedSlides'],
    ['--expected-text', 'expectedText'],
    ['--slide', 'slideNumber'],
    ['--powerpoint-executable', 'powerPointPath']
  ]);
  const booleanFlags = new Set(['--expected-text-from-contract']);

  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];

    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    if (booleanFlags.has(flag)) {
      options.expectedTextFromContract = true;
      continue;
    }

    if (!flag?.startsWith('--')) {
      fail(`Unexpected argument: ${flag ?? ''}`);
    }

    if (flag === '--all-slides') {
      options.allSlides = true;
      continue;
    }

    const value = tokens[index + 1];
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
    index += 1;
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

  if (options.allSlides && options.slideNumber !== undefined) {
    fail('--all-slides cannot be combined with --slide.');
  }

  if (options.allSlides && options.screenshotOut !== undefined) {
    fail('--all-slides cannot be combined with --screenshot-out.');
  }

  if (options.slideNumber !== undefined) {
    const slideNumber = Number(options.slideNumber);
    if (!Number.isInteger(slideNumber) || slideNumber < 1) {
      fail('--slide must be a positive integer.');
    }
    options.slideNumber = slideNumber;
  } else {
    options.slideNumber = 1;
  }

  if (options.expectedTextFromContract && !options.runDir) {
    fail('--expected-text-from-contract requires --run-dir.');
  }

  return options;
};

const uniqueExpectedText = (values = []) => {
  const unique = [];
  for (const value of Array.isArray(values) ? values : [values]) {
    if (typeof value !== 'string' || unique.includes(value)) {
      continue;
    }
    unique.push(value);
  }
  return unique;
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
  const runDir = options.runDir ? path.resolve(options.runDir) : undefined;
  const expectedSlides = options.expectedSlides ?? (
    runDir ? inferExpectedSlidesForRunDir(runDir) : undefined
  );
  const inferredExpectedText = options.expectedTextFromContract
    ? inferExpectedTextForRunDir(runDir)
    : undefined;
  if (options.expectedTextFromContract && (!Array.isArray(inferredExpectedText) || inferredExpectedText.length === 0)) {
    fail('Could not infer expected text from deck_contract.json.');
  }
  const expectedText = uniqueExpectedText([
    ...(Array.isArray(inferredExpectedText) ? inferredExpectedText : []),
    ...(Array.isArray(options.expectedText) ? options.expectedText : [])
  ]);
  const pptxPath = resolvePptxPath(options);
  const structural = inspectPptxFile(pptxPath);
  const structuralValidation = validatePptxSmokeResult(structural, {
    expectedSlides,
    expectedText
  });
  if (!structuralValidation.ok) {
    process.stdout.write(`${JSON.stringify({ ...structural, expectedSlides, expectedText, ...structuralValidation }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }

  if (options.slideNumber > structural.slideCount) {
    fail(`--slide ${options.slideNumber} exceeds PPTX slide count ${structural.slideCount}.`);
  }

  if (options.allSlides) {
    try {
      const slideNumbers = Array.from({ length: structural.slideCount }, (_, index) => index + 1);
      const visual = exportSlidesWithPowerPoint({
        pptxPath,
        powerPointPath: options.powerPointPath,
        slideNumbers
      });
      process.stdout.write(`${JSON.stringify({ ...structural, expectedSlides, expectedText, ...structuralValidation, ...visual }, null, 2)}\n`);
    } catch (error) {
      writeRuntimeFailure(error, {
        pptxPath,
        expectedSlides,
        expectedText,
        slideNumbers: Array.from({ length: structural.slideCount }, (_, index) => index + 1)
      });
    }
    return;
  }

  const screenshotPath = path.resolve(options.screenshotOut ?? defaultPptxScreenshotPath(pptxPath, process.cwd(), options.slideNumber));
  try {
    const visual = exportFirstSlideWithPowerPoint({
      pptxPath,
      screenshotPath,
      powerPointPath: options.powerPointPath,
      slideNumber: options.slideNumber
    });
    process.stdout.write(`${JSON.stringify({ ...structural, expectedSlides, expectedText, ...structuralValidation, ...visual }, null, 2)}\n`);
  } catch (error) {
    writeRuntimeFailure(error, {
      pptxPath,
      expectedSlides,
      expectedText,
      slideNumbers: [options.slideNumber],
      screenshotPath
    });
  }
};

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
