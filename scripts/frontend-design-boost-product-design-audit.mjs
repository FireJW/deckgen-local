#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'product-design-audit');
const requiredFields = [
  'surface',
  'flow',
  'destination',
  'capture tool',
  'numbered step list',
  'screenshot evidence',
  'ux and design findings',
  'accessibility risks',
  'evidence limits',
  'general health',
  'final result'
];
const allowedFinalResults = new Set(['passed', 'blocked']);

const usage = [
  'frontend-design-boost-product-design-audit --surface <path-or-url> --flow <name> [--steps <a;b;c>] [--destination <local-folder|figma>] [--capture-tool <browser|chrome|playwright>] [--out-dir <path>]',
  'frontend-design-boost-product-design-audit --check <product-design-audit.md>',
  '',
  'Scaffold or validate a Product Design style product-flow audit report for local frontend-design-boost fallback work.',
  'This command does not capture screenshots, control a browser, call Product Design, create Figma files, install dependencies, or write outside this repo.'
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
const resolveInput = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return resolveRepoPath(value);
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

const readMarkdown = (filePath) => readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
const normalizeForCheck = (text) => text.toLowerCase().replace(/\r\n/g, '\n');
const extractFinalResult = (text) => {
  const match = normalizeForCheck(text).match(/final result:\s*(passed|blocked)/);
  return match?.[1] ?? '';
};
const parseSteps = (value) => String(value || 'Open surface')
  .split(';')
  .map((step) => step.trim())
  .filter(Boolean)
  .map((label, index) => ({
    number: index + 1,
    label,
    screenshotPath: '',
    generalHealth: 'blocked: screenshot not captured',
    notes: 'Capture and inspect the screenshot before writing audit findings for this step.'
  }));

const validateAudit = (filePath) => {
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
      'A blocked Product Design audit scaffold is valid as a report structure but not ready for handoff.',
      'A passed audit requires current-run screenshots or named blockers for every important step.'
    ]
  };
};

const renderMarkdown = ({ surface, flow, destination, captureTool, steps, finalResult, blockers }) => [
  '# Product Design Flow Audit',
  '',
  `surface: ${surface || 'missing'}`,
  `flow: ${flow || 'missing'}`,
  `destination: ${destination}`,
  `capture tool: ${captureTool}`,
  '',
  '## Numbered Step List',
  '',
  ...steps.flatMap((step) => [
    `${step.number}. ${step.label}`,
    `   - screenshot: ${step.screenshotPath || 'missing'}`,
    `   - general health: ${step.generalHealth}`,
    `   - notes: ${step.notes}`
  ]),
  '',
  '## Screenshot Evidence',
  '',
  '- blocked: screenshots have not been captured or inspected in this scaffold.',
  '- required: save accepted screenshots in order, such as `01-start.png`, `02-action.png`, and `03-result.png`.',
  '- required: reject blank, loading, cropped, blocked, or wrong-state screenshots before using them as evidence.',
  '',
  '## UX and Design Findings',
  '',
  '- blocked: findings must be tied to captured screenshots or named step blockers.',
  '- required: note strengths, UX issues, design issues, and whether the next action is clear for each step.',
  '',
  '## Accessibility Risks',
  '',
  '- blocked: accessibility risks have not been assessed from current screenshots.',
  '- required: state what can be inferred from screenshots and what still needs keyboard, screen reader, contrast, or semantic testing.',
  '',
  '## Evidence Limits',
  '',
  '- This scaffold did not capture screenshots, inspect browser state, place screenshots in Figma, or run accessibility tooling.',
  '- Do not claim full accessibility compliance from screenshots alone.',
  '- Do not use memory, prior chats, or old screenshots as audit evidence unless the user explicitly provides them.',
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
  if (!existsSync(checkPath)) fail(`Product Design audit report does not exist: ${checkPathOption}`);
  const checkReport = {
    schema: 'frontend-design-boost-product-design-audit/v1',
    ok: true,
    externalActionsExecuted: false,
    ...validateAudit(checkPath)
  };
  process.stdout.write(`${JSON.stringify(checkReport, null, 2)}\n`);
  process.exit(checkReport.valid ? 0 : 1);
}

const surfaceInput = readOption(args, '--surface');
const flow = readOption(args, '--flow');
const destination = readOption(args, '--destination') || 'local-folder';
const captureTool = readOption(args, '--capture-tool') || 'browser';
const outDir = resolveRepoPath(readOption(args, '--out-dir') || defaultOutDir);

if (!surfaceInput) fail('Missing required --surface.');
if (!flow) fail('Missing required --flow.');
if (!['local-folder', 'figma'].includes(destination)) fail('--destination must be local-folder or figma.');
if (!['browser', 'chrome', 'playwright'].includes(captureTool)) fail('--capture-tool must be browser, chrome, or playwright.');
if (!isPathInside(outDir, root)) fail('--out-dir must point inside this repo.');

const surface = resolveInput(surfaceInput);
const steps = parseSteps(readOption(args, '--steps'));
const blockers = [];
if (surface && !/^https?:\/\//i.test(surface) && !existsSync(surface)) blockers.push('surface path does not exist');
blockers.push('screenshots have not been captured');
blockers.push('screenshots have not been inspected or accepted');
blockers.push('UX, design, and accessibility findings are not yet tied to captured screenshots');
if (destination === 'figma') blockers.push('Figma placement has not been verified');

mkdirSync(outDir, { recursive: true });
const markdownPath = path.join(outDir, 'product-design-audit.md');
const reportPath = path.join(outDir, 'product-design-audit-report.json');
const finalResult = 'blocked';
const markdown = renderMarkdown({
  surface: toProjectPath(surface),
  flow,
  destination,
  captureTool,
  steps,
  finalResult,
  blockers
});
writeFileSync(markdownPath, markdown, 'utf8');

const check = validateAudit(markdownPath);
const report = {
  schema: 'frontend-design-boost-product-design-audit/v1',
  ok: true,
  externalActionsExecuted: false,
  mode: 'scaffold',
  finalResult,
  readyForHandoff: false,
  inputs: {
    surface: toProjectPath(surface),
    flow,
    destination,
    captureTool,
    outDir: toProjectPath(outDir)
  },
  steps,
  artifacts: {
    markdownPath: toProjectPath(markdownPath),
    reportPath: toProjectPath(reportPath)
  },
  requiredFields,
  blockers,
  check,
  notes: [
    'This scaffold intentionally starts blocked because no screenshots were captured or inspected.',
    'Use Product Design audit directly when callable; otherwise fill this local report from current-run screenshots and step notes.',
    'Do not change final result to passed until every important step has accepted screenshot evidence or a named blocker.'
  ]
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
