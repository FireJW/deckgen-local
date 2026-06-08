#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultDecisionPath = path.join(defaultPackDir, 'image-decision-report.json');
const defaultOutDir = defaultPackDir;

const usage = [
  'frontend-design-boost-image-implementation-handoff [--decision <path>] [--evidence <path>] [--acceptance <path>] [--asset-id <id>] [--out-dir <dir>]',
  '',
  'Convert image decision, evidence, and acceptance reports into an implementation handoff for HTML, React, or Tailwind work.',
  'This command is local-only; it does not call image generation APIs.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    decisionPath: defaultDecisionPath,
    evidencePath: '',
    acceptancePath: '',
    assetId: '',
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

    if (flag === '--decision') {
      options.decisionPath = value;
    } else if (flag === '--evidence') {
      options.evidencePath = value;
    } else if (flag === '--acceptance') {
      options.acceptancePath = value;
    } else if (flag === '--asset-id') {
      options.assetId = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const toProjectPath = (filePath) => {
  const absolutePath = path.resolve(filePath);
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  return relative.startsWith('..') || path.isAbsolute(relative) ? absolutePath.split(path.sep).join('/') : relative;
};

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) fail(`Missing ${label}: ${toProjectPath(filePath)}`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${label}: ${error.message}`);
  }
};

const readOptionalJson = (filePath, label) => {
  if (!filePath) return null;
  return readJson(path.resolve(filePath), label);
};

const normalizeDisplayPath = (filePath) => String(filePath ?? '').replace(/\\/g, '/');

const sourceLooksLikeBuiltInGeneratedImages = (acceptance) => {
  const assets = Array.isArray(acceptance?.importReport?.assets) ? acceptance.importReport.assets : [];
  return assets.some((asset) =>
    asset.copied === true
    && asset.dimensionsMatch === true
    && /(^|\/)generated_images(\/|$)/i.test(normalizeDisplayPath(asset.sourcePath))
  );
};

const findSelectedDecision = (decision, assetId) => {
  const matrix = Array.isArray(decision.decisionMatrix) ? decision.decisionMatrix : [];
  if (assetId) return matrix.find((item) => item.id === assetId) ?? null;
  return matrix.find((item) => item.recommendation === 'candidate-for-acceptance') ?? matrix[0] ?? null;
};

const buildRouteEvidence = ({ evidence, acceptance }) => {
  const provenanceReady = acceptance?.goalAudit?.imagegenAcceptance?.provenanceReady === true
    || sourceLooksLikeBuiltInGeneratedImages(acceptance);

  return {
    model: evidence?.model ?? acceptance?.model ?? '',
    transport: evidence?.transport ?? acceptance?.route ?? '',
    liveGenerationEvidence: evidence?.liveGenerationEvidence === true || acceptance?.imageEvidence?.liveGenerationEvidence === true,
    evidenceMode: evidence?.evidenceMode ?? acceptance?.imageEvidence?.evidenceMode ?? '',
    evidencePath: evidence?.reportPath ?? acceptance?.evidencePath ?? acceptance?.imageEvidence?.reportPath ?? '',
    acceptancePath: acceptance?.reportPath ?? '',
    acceptanceOk: acceptance ? acceptance.ok === true : false,
    acceptanceSupplied: Boolean(acceptance),
    provenanceReady,
    sourcePath: acceptance?.importReport?.assets?.find((asset) => asset.assetId === acceptance.assetId)?.sourcePath ?? '',
    assetDimensionsMatch: evidence?.asset?.dimensionsMatch === true || acceptance?.imageEvidence?.asset?.dimensionsMatch === true
  };
};

const buildBlockers = ({ selectedDecision, routeEvidence }) => {
  const blockers = [];
  if (!selectedDecision) {
    blockers.push('missing image decision asset');
    return blockers;
  }
  if (selectedDecision.recommendation !== 'candidate-for-acceptance') {
    blockers.push(`selected asset recommendation is ${selectedDecision.recommendation || 'missing'}`);
  }
  if (routeEvidence.liveGenerationEvidence !== true) {
    blockers.push('missing live image evidence');
  }
  if (routeEvidence.assetDimensionsMatch !== true) {
    blockers.push('selected asset dimensions are not verified');
  }
  if (routeEvidence.transport === 'built-in-imagegen' && routeEvidence.acceptanceSupplied !== true) {
    blockers.push('missing built-in imagegen acceptance report');
  }
  if (routeEvidence.acceptanceSupplied && routeEvidence.acceptanceOk !== true) {
    blockers.push('imagegen acceptance did not pass');
  }
  if (routeEvidence.transport === 'built-in-imagegen' && routeEvidence.provenanceReady !== true) {
    blockers.push('built-in imagegen provenance is not ready');
  }
  return blockers;
};

const designTokenExtraction = (selectedDecision) => ({
  section: 'Design Token Extraction',
  paletteRoles: ['background', 'surface', 'border', 'text', 'accent', 'warning', 'success', 'danger'],
  layoutRoles: ['spacing rhythm', 'radius rule', 'surface hierarchy', 'asset crop behavior', 'first viewport density'],
  extractionQuestions: selectedDecision?.extractionQuestions ?? [],
  sourcePolicy: 'Extract design intent from the selected image; rebuild structure, states, data, and accessibility in code.'
});

const implementationChecklist = (selectedDecision) => [
  'Map extracted palette roles into repo-native tokens before layout work.',
  `Wire the accepted asset through the project-local path: ${selectedDecision?.outputPath || selectedDecision?.projectPath || 'missing'}.`,
  'Use the selected image as visual direction for HTML, React, or Tailwind implementation, not as generated UI truth.',
  'Rebuild controls, table behavior, copy, data, focus states, loading, empty, error, disabled, hover, and active states in code.',
  'Keep generated UI text, fake data, brand marks, and inaccessible spacing out of production implementation.',
  'Run asset smoke, then desktop and mobile screenshot QA after wiring the asset.'
];

const renderMarkdown = ({ report }) => [
  '# Frontend Design Boost Image Implementation Handoff',
  '',
  `Selected asset: \`${report.selectedAsset.id}\``,
  `Model: \`${report.routeEvidence.model || 'not verified'}\``,
  `Transport: \`${report.routeEvidence.transport || 'not verified'}\``,
  `Ready for implementation: ${report.readyForImplementation ? 'yes' : 'no'}`,
  '',
  '## Selected Asset',
  '',
  `- Slot: ${report.selectedAsset.slot || 'unspecified'}`,
  `- Recommendation: ${report.selectedAsset.recommendation}`,
  `- Score: ${report.selectedAsset.score}`,
  `- Project-local asset: \`${report.selectedAsset.projectLocalAssetPath}\``,
  '',
  '## Route Evidence',
  '',
  `- Live image evidence: ${report.routeEvidence.liveGenerationEvidence ? 'yes' : 'no'}`,
  `- Evidence path: \`${report.routeEvidence.evidencePath || 'not supplied'}\``,
  `- Acceptance path: \`${report.routeEvidence.acceptancePath || 'not supplied'}\``,
  `- Built-in provenance ready: ${report.routeEvidence.provenanceReady ? 'yes' : 'no'}`,
  '',
  '## Design Token Extraction',
  '',
  ...report.designTokenExtraction.paletteRoles.map((role) => `- ${role}`),
  '',
  'Questions:',
  ...report.designTokenExtraction.extractionQuestions.map((question) => `- ${question}`),
  '',
  '## Implementation Checklist',
  '',
  ...report.implementationChecklist.map((item) => `- ${item}`),
  '',
  '## Do Not Copy',
  '',
  ...report.doNotCopy.map((item) => `- ${item}`),
  '',
  '## Blockers',
  '',
  ...(report.blockers.length > 0 ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
  ''
].join('\n');

const options = parseArgs();
const decisionPath = path.resolve(options.decisionPath);
const evidencePath = options.evidencePath ? path.resolve(options.evidencePath) : '';
const acceptancePath = options.acceptancePath ? path.resolve(options.acceptancePath) : '';
const outDir = path.resolve(options.outDir);
const decision = readJson(decisionPath, 'image decision report');
if (decision.schema !== 'frontend-design-boost-image-decision/v1') {
  fail(`Unsupported image decision schema: ${decision.schema ?? 'missing'}`);
}
const evidence = readOptionalJson(evidencePath, 'image evidence report');
if (evidence && evidence.schema !== 'frontend-design-boost-image-evidence/v1') {
  fail(`Unsupported image evidence schema: ${evidence.schema ?? 'missing'}`);
}
const acceptance = readOptionalJson(acceptancePath, 'imagegen acceptance report');
if (acceptance && acceptance.schema !== 'frontend-design-boost-imagegen-acceptance/v1') {
  fail(`Unsupported imagegen acceptance schema: ${acceptance.schema ?? 'missing'}`);
}

const selectedDecision = findSelectedDecision(decision, options.assetId);
if (!selectedDecision) fail(`No image decision asset found for id: ${options.assetId || 'candidate-for-acceptance'}`);
const routeEvidence = buildRouteEvidence({ evidence, acceptance });
const blockers = buildBlockers({ selectedDecision, routeEvidence });

mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'image-implementation-handoff-report.json');
const markdownPath = path.join(outDir, 'image-implementation-handoff.md');
const report = {
  schema: 'frontend-design-boost-image-implementation-handoff/v1',
  ok: true,
  executed: false,
  readyForImplementation: blockers.length === 0,
  generatedAt: new Date().toISOString(),
  decisionPath: toProjectPath(decisionPath),
  evidencePath: evidencePath ? toProjectPath(evidencePath) : '',
  acceptancePath: acceptancePath ? toProjectPath(acceptancePath) : '',
  reportPath: toProjectPath(reportPath),
  markdownPath: toProjectPath(markdownPath),
  sourceBrief: decision.sourceBrief ?? '',
  sourceReferenceIntake: decision.sourceReferenceIntake ?? '',
  selectedAsset: {
    id: selectedDecision.id,
    label: selectedDecision.label ?? selectedDecision.id,
    slot: selectedDecision.slot ?? '',
    status: selectedDecision.status ?? '',
    recommendation: selectedDecision.recommendation ?? '',
    score: selectedDecision.score ?? 0,
    projectLocalAssetPath: selectedDecision.outputPath || selectedDecision.projectPath || '',
    rationale: selectedDecision.rationale ?? '',
    acceptanceCriteria: selectedDecision.acceptanceCriteria ?? [],
    uxRisks: selectedDecision.uxRisks ?? []
  },
  routeEvidence,
  sections: [
    'Design Token Extraction',
    'Implementation Checklist',
    'Do Not Copy',
    'Route Evidence',
    'Blockers'
  ],
  designTokenExtraction: designTokenExtraction(selectedDecision),
  implementationChecklist: implementationChecklist(selectedDecision),
  doNotCopy: [
    'Do not copy generated UI text, fake metrics, brand marks, or inaccessible spacing.',
    'Do not let the generated bitmap replace semantic HTML, React component state, or Tailwind responsive rules.',
    'Do not claim final UI quality until desktop and mobile screenshot QA pass.'
  ],
  blockers
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown({ report }), 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
