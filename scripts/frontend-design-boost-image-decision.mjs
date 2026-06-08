#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultIntakePath = path.join(defaultPackDir, 'asset-intake-report.json');
const defaultOutDir = defaultPackDir;

const usage = [
  'frontend-design-boost-image-decision [--intake <path>] [--out-dir <dir>]',
  '',
  'Convert an asset intake report into a visual decision matrix for frontend implementation.',
  'This command is local-only; it does not call image generation APIs.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    intakePath: defaultIntakePath,
    outDir: defaultOutDir
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      fail(`Unexpected or missing value near ${flag ?? ''}.`);
    }

    if (flag === '--intake') {
      options.intakePath = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const relativePath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');

const readJson = (filePath) => {
  if (!existsSync(filePath)) fail(`Missing required file: ${relativePath(filePath)}`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${relativePath(filePath)}: ${error.message}`);
  }
};

const scoreAsset = (asset) => {
  const criteria = [
    {
      id: 'slot-fit',
      label: 'UI slot is explicit',
      score: asset.slot ? 20 : 8
    },
    {
      id: 'asset-availability',
      label: 'Generated image is locally available',
      score: asset.status === 'available' ? 25 : 5
    },
    {
      id: 'prompt-traceability',
      label: 'Prompt is traceable to the brief',
      score: asset.prompt ? 20 : 8
    },
    {
      id: 'implementation-path',
      label: 'Project-local output path is known',
      score: asset.outputPath || asset.projectPath ? 15 : 4
    },
    {
      id: 'qa-readiness',
      label: 'Declared or decoded dimensions are present',
      score: asset.dimensions || asset.declaredSize ? 20 : 6
    }
  ];
  const total = criteria.reduce((sum, item) => sum + item.score, 0);
  return { total, criteria };
};

const buildMatrixItem = (asset) => {
  const score = scoreAsset(asset);
  const available = asset.status === 'available';
  const recommendation = available ? 'candidate-for-acceptance' : 'defer-until-generated';

  return {
    id: asset.id,
    label: asset.label ?? asset.id,
    slot: asset.slot ?? '',
    status: asset.status,
    outputPath: asset.outputPath ?? '',
    projectPath: asset.projectPath ?? '',
    score: score.total,
    scoreCriteria: score.criteria,
    recommendation,
    rationale: available
      ? 'Available for visual review, token extraction, and asset smoke validation before implementation.'
      : 'Keep the existing fallback until generation, smoke validation, and visual review are complete.',
    acceptanceCriteria: [
      'Matches the requested page type, audience, density, and primary action.',
      'Supports the UI slot without obscuring primary copy or controls.',
      'Uses project-local paths and passes asset smoke before implementation.',
      'Survives desktop and mobile screenshot QA after wiring.',
      'Does not copy generated UI text, fake data, brand marks, or inaccessible layout details.'
    ],
    extractionQuestions: [
      'Which palette roles should become background, surface, border, text, and accent tokens?',
      'What spacing rhythm, radius rule, and hierarchy should be copied as design intent?',
      'Which visible details are only reference material and must be rebuilt in code?',
      'What responsive risk appears at 390 x 844?'
    ],
    uxRisks: [
      'Generated references can hide impossible spacing or unreadable text.',
      'A polished image does not prove accessible states, table behavior, or data correctness.',
      'Decorative assets can weaken operational density if they displace real workflow content.'
    ]
  };
};

const renderMarkdown = ({ report }) => [
  '# Frontend Design Boost Image Decision Report',
  '',
  `Source intake: \`${report.intakePath}\``,
  `Source brief: \`${report.sourceBrief || ''}\``,
  `Reference intake: \`${report.sourceReferenceIntake || 'not supplied'}\``,
  '',
  '## Summary',
  '',
  `- Assets reviewed: ${report.assetCount}`,
  `- Available assets: ${report.availableCount}`,
  `- Deferred assets: ${report.deferredCount}`,
  `- Manual decision required: ${report.manualDecisionRequired ? 'yes' : 'no'}`,
  '',
  '## Visual Decision Matrix',
  '',
  ...report.decisionMatrix.flatMap((item) => [
    `### ${item.id}`,
    '',
    `- Slot: ${item.slot || 'unspecified'}`,
    `- Status: ${item.status}`,
    `- Recommendation: ${item.recommendation}`,
    `- Score: ${item.score}`,
    `- Output: \`${item.outputPath}\``,
    `- Rationale: ${item.rationale}`,
    '',
    'Acceptance Criteria:',
    ...item.acceptanceCriteria.map((criterion) => `- ${criterion}`),
    '',
    'Design Token Extraction:',
    ...item.extractionQuestions.map((question) => `- ${question}`),
    ''
  ]),
  '## Rejected or Deferred',
  '',
  ...(report.deferredCandidates.length > 0
    ? report.deferredCandidates.map((item) => `- \`${item.id}\`: ${item.rationale}`)
    : ['- None.']),
  '',
  '## Implementation Handoff',
  '',
  '- Accept assets only after visual review, asset smoke, and desktop and mobile screenshot QA.',
  '- Extract tokens and layout intent; rebuild controls, states, accessibility, and data behavior in code.',
  '- Do not copy generated UI text, fake data, brand marks, or layout details that fail responsive review.',
  ''
].join('\n');

const options = parseArgs();
const intakePath = path.resolve(options.intakePath);
const outDir = path.resolve(options.outDir);
const intake = readJson(intakePath);

if (intake.schema !== 'frontend-design-boost-asset-intake/v1') {
  fail(`Unsupported asset intake schema: ${intake.schema ?? 'missing'}`);
}

const decisionMatrix = (intake.assets ?? []).map(buildMatrixItem);
const acceptedCandidates = decisionMatrix.filter((item) => item.recommendation === 'candidate-for-acceptance');
const deferredCandidates = decisionMatrix.filter((item) => item.recommendation === 'defer-until-generated');

mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'image-decision-report.json');
const markdownPath = path.join(outDir, 'image-decision.md');
const report = {
  schema: 'frontend-design-boost-image-decision/v1',
  ok: true,
  executed: false,
  generatedAt: new Date().toISOString(),
  intakePath: relativePath(intakePath),
  reportPath: relativePath(reportPath),
  markdownPath: relativePath(markdownPath),
  sourceBrief: intake.sourceBrief ?? '',
  sourceReferenceIntake: intake.sourceReferenceIntake ?? '',
  assetCount: decisionMatrix.length,
  availableCount: acceptedCandidates.length,
  deferredCount: deferredCandidates.length,
  manualDecisionRequired: true,
  sections: [
    'Visual Decision Matrix',
    'Acceptance Criteria',
    'Design Token Extraction',
    'Implementation Handoff',
    'Rejected or Deferred'
  ],
  decisionPolicy: 'Generated images are reference inputs. Accept, defer, or reject each asset before coding from it.',
  implementationHandoff: [
    'Run visual review before accepting any generated reference.',
    'Run asset smoke for generated files before wiring them into HTML, React, or Tailwind.',
    'Run desktop and mobile screenshot QA after implementation.',
    'Do not copy generated UI text, fake data, brand marks, or inaccessible layout details.'
  ],
  decisionMatrix,
  acceptedCandidates,
  deferredCandidates
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown({ report }), 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
