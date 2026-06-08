#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'product-design-qa');
const requiredFields = [
  'source visual truth path',
  'implementation screenshot path',
  'viewport',
  'state',
  'full-view comparison evidence',
  'focused region comparison evidence',
  'fonts and typography',
  'spacing and layout rhythm',
  'colors and visual tokens',
  'image quality and asset fidelity',
  'copy and content',
  'findings',
  'patches made since the previous qa pass',
  'final result'
];
const allowedFinalResults = new Set(['passed', 'blocked']);

const usage = [
  'frontend-design-boost-product-design-qa [--source <path-or-url>] [--implementation <path-or-url>] [--viewport <WIDTHxHEIGHT>] [--state <name>] [--out-dir <path>]',
  'frontend-design-boost-product-design-qa --check <design-qa.md>',
  '',
  'Scaffold or validate a Product Design style design-qa.md for the local frontend-design-boost fallback.',
  'This command does not capture screenshots, call Product Design, generate images, install dependencies, or write outside this repo.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const readOption = (args, name) => {
  const index = args.indexOf(name);
  if (index === -1) return '';
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : '';
};

const normalizeDisplayPath = (filePath) => String(filePath ?? '').replace(/\\/g, '/');
const resolveRepoPath = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
};
const isPathInside = (childPath, parentPath) => {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};
const toProjectPath = (filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const absolutePath = path.resolve(filePath);
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  return relative.startsWith('..') || path.isAbsolute(relative)
    ? normalizeDisplayPath(absolutePath)
    : relative;
};
const resolveInput = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return resolveRepoPath(value);
};
const validateViewport = (viewport) => /^\d+x\d+$/.test(viewport);

const readMarkdown = (filePath) => readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
const normalizeForCheck = (text) => text.toLowerCase().replace(/\r\n/g, '\n');
const extractFinalResult = (text) => {
  const match = normalizeForCheck(text).match(/final result:\s*(passed|blocked)/);
  return match?.[1] ?? '';
};

const validateDesignQa = (filePath) => {
  const text = readMarkdown(filePath);
  const normalized = normalizeForCheck(text);
  const missingFields = requiredFields.filter((field) => !normalized.includes(field));
  const finalResult = extractFinalResult(text);
  if (!finalResult) missingFields.push('final result value');
  const valid = missingFields.length === 0 && allowedFinalResults.has(finalResult);

  return {
    mode: 'check',
    valid,
    finalResult,
    readyForHandoff: valid && finalResult === 'passed',
    missingFields,
    checkedPath: toProjectPath(filePath),
    notes: [
      'A blocked design-qa.md is valid as a report but not ready for handoff.',
      'A passed design-qa.md is ready only if its evidence paths point to real captured source and implementation comparison artifacts.'
    ]
  };
};

const renderDesignQa = ({ source, implementation, viewport, state, finalResult, blockers }) => [
  '# design-qa.md',
  '',
  `source visual truth path: ${source || 'missing'}`,
  `implementation screenshot path: ${implementation || 'missing'}`,
  `viewport: ${viewport}`,
  `state: ${state}`,
  '',
  '## Full-View Comparison Evidence',
  '',
  '- blocked: visual comparison has not been performed in this scaffold.',
  '- required: place source visual truth and implementation screenshot in the same comparison input before judging.',
  '',
  '## Focused Region Comparison Evidence',
  '',
  '- blocked: focused regions have not been captured or compared.',
  '- required: inspect regions where typography, controls, tables, charts, imagery, icons, or state fidelity matters.',
  '',
  '## Required Fidelity Surfaces',
  '',
  '### Fonts and Typography',
  '',
  '- blocked: not compared yet.',
  '',
  '### Spacing and Layout Rhythm',
  '',
  '- blocked: not compared yet.',
  '',
  '### Colors and Visual Tokens',
  '',
  '- blocked: not compared yet.',
  '',
  '### Image Quality and Asset Fidelity',
  '',
  '- blocked: not compared yet.',
  '',
  '### Copy and Content',
  '',
  '- blocked: not compared yet.',
  '',
  '## Findings',
  '',
  '- [P1] Design QA evidence is incomplete.',
  '  Location: whole surface.',
  '  Evidence: source and implementation have not been captured into the same comparison input.',
  '  Impact: handoff would rely on file paths or memory instead of visible evidence.',
  '  Fix: capture matched source and implementation screenshots, compare full view and required focused regions, then update this report.',
  '',
  '## Patches Made Since The Previous QA Pass',
  '',
  '- none recorded in this scaffold.',
  '',
  '## Implementation Checklist',
  '',
  '- Capture source visual truth.',
  '- Capture rendered implementation at the same viewport and state.',
  '- Create full-view comparison evidence.',
  '- Add focused region comparison evidence, or explain why it is not needed.',
  '- Evaluate fonts, spacing, colors, image fidelity, and copy/content explicitly.',
  '- Change final result to `passed` only when no actionable P0/P1/P2 findings remain.',
  '',
  '## Blockers',
  '',
  ...blockers.map((blocker) => `- ${blocker}`),
  '',
  `final result: ${finalResult}`,
  ''
].join('\n');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const checkPathOption = readOption(args, '--check');
if (checkPathOption) {
  const checkPath = resolveRepoPath(checkPathOption);
  if (!isPathInside(checkPath, root)) fail('--check must point inside this repo.');
  if (!existsSync(checkPath)) fail(`design-qa.md does not exist: ${checkPathOption}`);
  const checkReport = {
    schema: 'frontend-design-boost-product-design-qa/v1',
    ok: true,
    externalActionsExecuted: false,
    ...validateDesignQa(checkPath)
  };
  process.stdout.write(`${JSON.stringify(checkReport, null, 2)}\n`);
  process.exit(checkReport.valid ? 0 : 1);
}

const sourceInput = readOption(args, '--source');
const implementationInput = readOption(args, '--implementation');
const viewport = readOption(args, '--viewport') || '1440x900';
const state = readOption(args, '--state') || 'default';
const outDir = resolveRepoPath(readOption(args, '--out-dir') || defaultOutDir);

if (!validateViewport(viewport)) fail('--viewport must use WIDTHxHEIGHT format.');
if (!isPathInside(outDir, root)) fail('--out-dir must point inside this repo.');

const source = resolveInput(sourceInput);
const implementation = resolveInput(implementationInput);
const blockers = [];
if (!source) blockers.push('missing source visual truth path');
if (!implementation) blockers.push('missing implementation screenshot path');
if (source && !/^https?:\/\//i.test(source) && !existsSync(source)) blockers.push('source visual truth path does not exist');
if (implementation && !/^https?:\/\//i.test(implementation) && !existsSync(implementation)) {
  blockers.push('implementation screenshot path does not exist');
}
blockers.push('visual comparison has not been performed');
blockers.push('full-view comparison evidence has not been captured');
blockers.push('focused region comparison evidence has not been captured');

mkdirSync(outDir, { recursive: true });
const markdownPath = path.join(outDir, 'design-qa.md');
const reportPath = path.join(outDir, 'design-qa-report.json');
const finalResult = 'blocked';
const markdown = renderDesignQa({
  source: toProjectPath(source),
  implementation: toProjectPath(implementation),
  viewport,
  state,
  finalResult,
  blockers
});
writeFileSync(markdownPath, markdown, 'utf8');

const check = validateDesignQa(markdownPath);
const report = {
  schema: 'frontend-design-boost-product-design-qa/v1',
  ok: true,
  externalActionsExecuted: false,
  mode: 'scaffold',
  finalResult,
  readyForHandoff: false,
  inputs: {
    source: toProjectPath(source),
    implementation: toProjectPath(implementation),
    viewport,
    state,
    outDir: toProjectPath(outDir)
  },
  artifacts: {
    markdownPath: toProjectPath(markdownPath),
    reportPath: toProjectPath(reportPath)
  },
  requiredFields,
  blockers,
  check,
  notes: [
    'This scaffold intentionally starts blocked because no visual comparison was performed.',
    'Use the Product Design design-qa skill directly when callable; otherwise fill this repo-local report from captured source and implementation evidence.',
    'Do not change final result to passed until source visual truth and implementation screenshot have been compared at the same viewport and state.'
  ]
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
