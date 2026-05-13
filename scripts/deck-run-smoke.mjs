#!/usr/bin/env node
import path from 'node:path';
import {
  inspectDeckRunBundle,
  runDeckRunVisualSmokeGates,
  validateDeckRunBundleSmokeResult
} from '../src/qc/run-bundle-smoke.mjs';

const usage = [
  'deck-run-smoke --run-dir <deckgen-run-dir>',
  '               [--include-html-visual] [--include-pptx-visual]',
  '               [--pptx-expected-text <text> ...]',
  '               [--module-dir <node_modules>] [--browser-executable <path>] [--viewport <width>x<height>]',
  '               [--pptx-slide <n> | --pptx-visual-all-slides] [--powerpoint-executable <path>]'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = (tokens) => {
  const options = {};

  const valueFlags = new Map([
    ['--run-dir', 'runDir'],
    ['--module-dir', 'moduleDir'],
    ['--browser-executable', 'browserExecutable'],
    ['--viewport', 'viewport'],
    ['--pptx-slide', 'pptxVisualSlide'],
    ['--pptx-expected-text', 'pptxExpectedText'],
    ['--powerpoint-executable', 'powerPointExecutable']
  ]);

  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];

    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    if (flag === '--include-html-visual') {
      options.includeHtmlVisual = true;
      continue;
    }

    if (flag === '--include-pptx-visual') {
      options.includePptxVisual = true;
      continue;
    }

    if (flag === '--pptx-visual-all-slides') {
      options.pptxVisualAllSlides = true;
      continue;
    }

    const key = valueFlags.get(flag);
    if (!key) {
      fail(`Unsupported option: ${flag ?? ''}`);
    }

    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`Missing value for ${flag}.`);
    }

    if (key === 'pptxExpectedText') {
      options.pptxExpectedText = [...(options.pptxExpectedText ?? []), value];
    } else {
      options[key] = value;
    }
    index += 1;
  }

  if (!options.runDir) {
    fail('Missing required option: --run-dir.');
  }

  if (options.moduleDir !== undefined || options.browserExecutable !== undefined || options.viewport !== undefined) {
    options.includeHtmlVisual = true;
  }

  if (options.pptxVisualSlide !== undefined || options.pptxVisualAllSlides || options.powerPointExecutable !== undefined) {
    options.includePptxVisual = true;
  }

  if (options.pptxVisualAllSlides && options.pptxVisualSlide !== undefined) {
    fail('--pptx-visual-all-slides cannot be combined with --pptx-slide.');
  }

  if (options.pptxVisualSlide !== undefined) {
    const slide = Number(options.pptxVisualSlide);
    if (!Number.isInteger(slide) || slide < 1) {
      fail('--pptx-slide must be a positive integer.');
    }
    options.pptxVisualSlide = slide;
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
const summary = inspectDeckRunBundle({
  runDir: path.resolve(options.runDir),
  pptxExpectedText: options.pptxExpectedText
});
if (options.includeHtmlVisual || options.includePptxVisual) {
  summary.visual = runDeckRunVisualSmokeGates({
    runDir: path.resolve(options.runDir),
    expectedOutputs: summary.expectedOutputs,
    includeHtmlVisual: Boolean(options.includeHtmlVisual),
    includePptxVisual: Boolean(options.includePptxVisual),
    htmlVisualOptions: {
      moduleDir: options.moduleDir,
      browserExecutable: options.browserExecutable,
      viewport: options.viewport
    },
    pptxVisualOptions: {
      slide: options.pptxVisualSlide,
      allSlides: Boolean(options.pptxVisualAllSlides),
      powerPointExecutable: options.powerPointExecutable
    }
  });
}
const validation = validateDeckRunBundleSmokeResult(summary);

process.stdout.write(`${JSON.stringify({ ...summary, ...validation }, null, 2)}\n`);
if (!validation.ok) {
  process.exitCode = 1;
}
