#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'product-design-ideate');
const surfaceTypes = new Set(['desktop-dashboard', 'mobile-app', 'tablet-app', 'landing-page', 'component']);
const modes = new Set(['broad-exploration', 'existing-direction', 'component-structure']);
const requiredFields = [
  'confirmed brief',
  'target dimensions',
  'three independent directions',
  'image gen prompt seeds',
  'reference attachments',
  'selection gate',
  'build gate',
  'evidence limits',
  'final result'
];
const allowedFinalResults = new Set(['blocked', 'ready-for-selection', 'selected']);
const dimensionsBySurface = {
  'desktop-dashboard': '1440x1024',
  'mobile-app': '390x844',
  'tablet-app': '834x1194',
  'landing-page': '1440 wide scrollable',
  component: 'natural container size'
};

const usage = [
  'frontend-design-boost-product-design-ideate --brief <path> [--surface-type <desktop-dashboard|mobile-app|tablet-app|landing-page|component>] [--mode <broad-exploration|existing-direction|component-structure>] [--reference <path-or-url>] [--out-dir <path>]',
  'frontend-design-boost-product-design-ideate --check <product-design-ideation.md>',
  '',
  'Scaffold or validate a Product Design style three-direction ideation report for local frontend-design-boost fallback work.',
  'This command does not call Image Gen, call Product Design, create images, install dependencies, start a server, or write outside this repo.'
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

const readOptions = (args, name) => {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (value && !value.startsWith('--')) values.push(value);
  }
  return values;
};

const normalizeNewlines = (value) => String(value ?? '').replace(/\r\n/g, '\n');
const normalizeDisplayPath = (filePath) => String(filePath ?? '').replace(/\\/g, '/');
const isHttpUrl = (value) => /^https?:\/\//i.test(String(value ?? ''));
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
  if (isHttpUrl(filePath)) return filePath;
  const absolutePath = path.resolve(filePath);
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  return relative.startsWith('..') || path.isAbsolute(relative)
    ? normalizeDisplayPath(absolutePath)
    : relative;
};
const resolveReference = (reference) => {
  if (!reference) return '';
  if (isHttpUrl(reference)) return reference;
  return resolveRepoPath(reference);
};

const extractBriefSnapshot = (briefText) => {
  const normalized = normalizeNewlines(briefText);
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = normalized.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? lines[0] ?? 'Untitled frontend task';
  const lower = normalized.toLowerCase();
  const pageType = lower.includes('dashboard')
    ? 'operational dashboard'
    : lower.includes('landing')
      ? 'landing page'
      : lower.includes('report')
        ? 'data report'
        : 'product UI';
  const densityTarget = lower.includes('dense') || lower.includes('compact')
    ? 'dense'
    : lower.includes('airy')
      ? 'airy'
      : 'balanced';

  return {
    title,
    pageType,
    densityTarget,
    excerpt: lines.slice(0, 8).join('\n'),
    wordCount: normalized.trim() ? normalized.trim().split(/\s+/).length : 0
  };
};

const inferSurfaceType = (briefSnapshot) => {
  if (briefSnapshot.pageType === 'operational dashboard' || briefSnapshot.pageType === 'data report') {
    return 'desktop-dashboard';
  }
  if (briefSnapshot.pageType === 'landing page') return 'landing-page';
  return 'desktop-dashboard';
};

const normalizeReferences = (references) => references.map((reference) => {
  const resolved = resolveReference(reference);
  const exists = isHttpUrl(resolved) ? true : existsSync(resolved);
  return {
    input: normalizeDisplayPath(reference),
    path: toProjectPath(resolved),
    type: isHttpUrl(resolved) ? 'url' : /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(resolved) ? 'image' : 'file',
    exists,
    attachableToImageGen: isHttpUrl(resolved) || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(resolved)
  };
});

const directionTemplates = [
  {
    name: 'Signal Triage Console',
    hierarchyStrategy: 'Rank urgent signals first, then let evidence and actions sit one layer below.',
    layoutStrategy: 'Dense desktop dashboard with a left rail, compact KPI strip, alert queue, and detail inspector.',
    interactionModel: 'Filter, sort, inspect, and accept/reject actions without leaving the first viewport.'
  },
  {
    name: 'Evidence Timeline Workspace',
    hierarchyStrategy: 'Make chronology and source confidence the primary organizing model.',
    layoutStrategy: 'Timeline-led workspace with stacked evidence bands, comparison rows, and a persistent next-action area.',
    interactionModel: 'Step through evidence, expand source cards, and keep the active decision visible.'
  },
  {
    name: 'Decision Briefing Board',
    hierarchyStrategy: 'Lead with recommended decisions and explain why with compact supporting evidence.',
    layoutStrategy: 'Briefing board with recommendation lanes, confidence tags, exception handling, and a review queue.',
    interactionModel: 'Review the recommendation, inspect rationale, then hand off or defer with a recorded reason.'
  }
];

const buildPromptSeed = ({ direction, briefSnapshot, targetDimensions, mode, references }) => [
  'Create realistic, production-quality UI designs with clear hierarchy, strong typography, intentional imagery, and purposeful spacing.',
  '',
  `Target dimensions: ${targetDimensions}.`,
  `Concept name: ${direction.name}.`,
  `Confirmed brief: ${briefSnapshot.title}.`,
  `Page type: ${briefSnapshot.pageType}. Density target: ${briefSnapshot.densityTarget}.`,
  `Variation mode: ${mode}.`,
  `Hierarchy strategy: ${direction.hierarchyStrategy}`,
  `Layout strategy: ${direction.layoutStrategy}`,
  `Interaction model: ${direction.interactionModel}`,
  '',
  'Use spacing, grouping, alignment, typography, and hierarchy before adding borders or elevation.',
  'Do not default to a centered app card, do not put cards inside cards, and do not invent extra features.',
  'Do not add browser or device chrome around the mockup. Generate one independent idea only.',
  references.length > 0
    ? `Reference attachments to use when available: ${references.map((reference) => reference.path).join('; ')}.`
    : 'Reference attachments: none supplied; keep the direction grounded in the confirmed brief.'
].join('\n');

const buildDirections = ({ briefSnapshot, targetDimensions, mode, references }) => directionTemplates.map((direction, index) => ({
  number: index + 1,
  name: direction.name,
  hierarchyStrategy: direction.hierarchyStrategy,
  layoutStrategy: direction.layoutStrategy,
  interactionModel: direction.interactionModel,
  targetDimensions,
  promptSeed: buildPromptSeed({ direction, briefSnapshot, targetDimensions, mode, references })
}));

const normalizeForCheck = (text) => text.toLowerCase().replace(/\r\n/g, '\n');
const extractFinalResult = (text) => {
  const match = normalizeForCheck(text).match(/final result:\s*(blocked|ready-for-selection|selected)/);
  return match?.[1] ?? '';
};

const validateIdeation = (filePath) => {
  const text = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const normalized = normalizeForCheck(text);
  const missingFields = requiredFields.filter((field) => !normalized.includes(field));
  const finalResult = extractFinalResult(text);
  if (!finalResult) missingFields.push('final result value');
  const directionCount = (normalized.match(/^### direction\s+\d+/gm) ?? []).length;
  if (directionCount !== 3) missingFields.push('exactly three directions');
  const valid = missingFields.length === 0 && allowedFinalResults.has(finalResult);

  return {
    mode: 'check',
    valid,
    finalResult,
    readyForSelection: valid && finalResult === 'ready-for-selection',
    missingFields,
    checkedPath: toProjectPath(filePath),
    directionCount,
    notes: [
      'A blocked ideation scaffold is valid as a planning report but not ready for user selection.',
      'A ready-for-selection report requires three generated images, not only prompt seeds.'
    ]
  };
};

const renderMarkdown = (report) => [
  '# Product Design Ideation',
  '',
  `confirmed brief: ${report.briefSnapshot.title}`,
  `target dimensions: ${report.targetDimensions}`,
  `variation mode: ${report.variationMode}`,
  '',
  '## Reference Attachments',
  '',
  ...(report.references.length > 0
    ? report.references.map((reference) => `- ${reference.path} (${reference.type}, exists: ${reference.exists}, attachable: ${reference.attachableToImageGen})`)
    : ['- none supplied']),
  '',
  '## Three Independent Directions',
  '',
  ...report.conceptDirections.flatMap((direction) => [
    `### Direction ${direction.number}: ${direction.name}`,
    '',
    `- hierarchy strategy: ${direction.hierarchyStrategy}`,
    `- layout strategy: ${direction.layoutStrategy}`,
    `- interaction model: ${direction.interactionModel}`,
    `- target dimensions: ${direction.targetDimensions}`,
    ''
  ]),
  '## Image Gen Prompt Seeds',
  '',
  ...report.conceptDirections.flatMap((direction) => [
    `### Prompt Seed ${direction.number}: ${direction.name}`,
    '',
    '```text',
    direction.promptSeed,
    '```',
    ''
  ]),
  '## Selection Gate',
  '',
  '- blocked: three independent images have not been generated.',
  '- blocked: the user has not selected one direction as the visual target.',
  '- required: after generation, ask whether to explore more directions or choose 1, 2, or 3.',
  '',
  '## Build Gate',
  '',
  `- no build before selection: ${report.buildGate.noBuildBeforeSelection}`,
  '- selected visual target required before image-to-code, prototype, or repo UI implementation.',
  '- after selection, create image implementation handoff and run desktop/mobile screenshot QA.',
  '',
  '## Evidence Limits',
  '',
  '- This scaffold did not call Product Design, call Image Gen, create images, inspect references visually, or attach image files to a generation call.',
  '- Do not claim a reference was attached unless the future Image Gen call actually receives the image or readable path.',
  '- Do not treat prompt seeds as visual evidence.',
  '',
  '## Blockers',
  '',
  ...report.blockers.map((blocker) => `- ${blocker}`),
  '',
  `final result: ${report.finalResult}`,
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
  if (!existsSync(checkPath)) fail(`Product Design ideation report does not exist: ${checkPathOption}`);
  const checkReport = {
    schema: 'frontend-design-boost-product-design-ideate/v1',
    ok: true,
    externalActionsExecuted: false,
    ...validateIdeation(checkPath)
  };
  process.stdout.write(`${JSON.stringify(checkReport, null, 2)}\n`);
  process.exit(checkReport.valid ? 0 : 1);
}

const briefOption = readOption(args, '--brief');
if (!briefOption) fail('Missing required --brief path.');

const briefPath = resolveRepoPath(briefOption);
if (!isPathInside(briefPath, root)) fail('--brief must point inside this repo.');
if (!existsSync(briefPath)) fail(`Brief file does not exist: ${briefOption}`);

const briefSnapshot = extractBriefSnapshot(readFileSync(briefPath, 'utf8'));
const surfaceType = readOption(args, '--surface-type') || inferSurfaceType(briefSnapshot);
if (!surfaceTypes.has(surfaceType)) fail(`Unsupported --surface-type: ${surfaceType}`);

const variationMode = readOption(args, '--mode') || 'broad-exploration';
if (!modes.has(variationMode)) fail(`Unsupported --mode: ${variationMode}`);

const outDir = resolveRepoPath(readOption(args, '--out-dir') || defaultOutDir);
if (!isPathInside(outDir, root)) fail('--out-dir must point inside this repo.');

const references = normalizeReferences(readOptions(args, '--reference'));
const invalidReferences = references.filter((reference) => !reference.exists);
const targetDimensions = dimensionsBySurface[surfaceType];
const conceptDirections = buildDirections({
  briefSnapshot,
  targetDimensions,
  mode: variationMode,
  references
});
const blockers = [
  'three independent images have not been generated',
  'user has not selected one direction as the visual target',
  'image implementation handoff has not been created',
  'desktop and mobile screenshot QA has not been run'
];
for (const reference of invalidReferences) blockers.push(`reference path does not exist: ${reference.path}`);

mkdirSync(outDir, { recursive: true });
const markdownPath = path.join(outDir, 'product-design-ideation.md');
const reportPath = path.join(outDir, 'product-design-ideation-report.json');
const finalResult = 'blocked';
const report = {
  schema: 'frontend-design-boost-product-design-ideate/v1',
  ok: true,
  externalActionsExecuted: false,
  mode: 'scaffold',
  finalResult,
  readyForImageGeneration: invalidReferences.length === 0,
  readyForSelection: false,
  inputs: {
    briefPath: toProjectPath(briefPath),
    surfaceType,
    mode: variationMode,
    outDir: toProjectPath(outDir)
  },
  briefSnapshot,
  targetDimensions,
  variationMode,
  references,
  conceptDirections,
  buildGate: {
    noBuildBeforeSelection: true,
    selectedVisualTargetRequired: true,
    implementationHandoffRequired: true,
    screenshotQaRequired: true
  },
  artifacts: {
    markdownPath: toProjectPath(markdownPath),
    reportPath: toProjectPath(reportPath)
  },
  requiredFields,
  blockers,
  notes: [
    'Use Product Design ideate directly when callable; otherwise use these prompt seeds with the local image-assisted workflow.',
    'Generate exactly three independent images before asking the user to choose a visual direction.',
    'Do not start implementation until a visual target is selected.'
  ]
};

writeFileSync(markdownPath, renderMarkdown(report), 'utf8');
const check = validateIdeation(markdownPath);
const output = { ...report, check };
writeFileSync(reportPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
