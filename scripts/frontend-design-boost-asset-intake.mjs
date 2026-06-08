#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultManifestPath = path.join(defaultPackDir, 'image-prompts.json');
const defaultSelectionPath = path.join(defaultPackDir, 'asset-selection.json');
const defaultOutDir = defaultPackDir;

const usage = [
  'frontend-design-boost-asset-intake [--manifest <path>] [--selection <path>] [--out-dir <dir>]',
  '',
  'Inspect generated image assets and write a design-extraction handoff report.',
  'This command is local-only; it does not call image generation APIs.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    manifestPath: defaultManifestPath,
    selectionPath: defaultSelectionPath,
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

    if (flag === '--manifest') {
      options.manifestPath = value;
    } else if (flag === '--selection') {
      options.selectionPath = value;
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

const parsePngDimensions = (filePath) => {
  const bytes = readFileSync(filePath);
  const isPng = bytes.length >= 24
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47;
  if (!isPng) return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
};

const buildExtractionChecklist = (target, manifestAsset) => [
  `Design Extraction for ${target.assetId ?? target.id}`,
  'Extract palette roles from the image, then map them to background, surface, border, text, accent, warning, success, and danger tokens.',
  'Extract spacing rhythm, radius rules, and first-viewport hierarchy before writing component code.',
  'Record which parts are usable design direction and which parts must not be copied into production.',
  `Preserve the intended UI slot: ${target.slot ?? target.role ?? manifestAsset?.useCase ?? 'unspecified'}.`,
  'Do not treat generated images as implementation truth; keep accessibility, responsive layout, and data correctness in code.'
];

const renderMarkdown = ({ manifest, selection, assets, summary }) => {
  const available = assets.filter((asset) => asset.status === 'available');
  const pending = assets.filter((asset) => asset.status === 'pending');

  return [
    '# Frontend Design Boost Asset Intake',
    '',
    `Source brief: \`${manifest.sourceBrief ?? ''}\``,
    `Reference intake: \`${manifest.sourceReferenceIntake || 'not supplied'}\``,
    `Asset selection: \`${selection.sourcePromptPack ?? 'asset-selection.json'}\``,
    '',
    '## Summary',
    '',
    `- Assets inspected: ${summary.assetCount}`,
    `- Available assets: ${summary.availableCount}`,
    `- Pending assets: ${summary.pendingCount}`,
    '',
    '## Available Assets',
    '',
    ...(available.length > 0
      ? available.map((asset) => `- \`${asset.id}\`: ${asset.outputPath} (${asset.dimensions.width}x${asset.dimensions.height})`)
      : ['- None yet.']),
    '',
    '## Pending Assets',
    '',
    ...(pending.length > 0
      ? pending.map((asset) => `- \`${asset.id}\`: ${asset.outputPath}`)
      : ['- None.']),
    '',
    '## Design Extraction',
    '',
    ...assets.flatMap((asset) => [
      `### ${asset.id}`,
      '',
      `Status: ${asset.status}`,
      `UI slot: ${asset.slot || 'unspecified'}`,
      `Output path: \`${asset.outputPath}\``,
      '',
      ...asset.extractionChecklist.map((item) => `- ${item}`),
      ''
    ]),
    '## Implementation Handoff',
    '',
    '- Use available assets only through project-local paths.',
    '- Keep pending assets behind existing fallbacks until the asset smoke gate passes.',
    '- Run `npm.cmd run smoke:frontend-design-boost:assets` after real generation.',
    '- Run desktop and mobile screenshot QA after wiring assets into the UI.',
    ''
  ].join('\n');
};

const options = parseArgs();
const manifestPath = path.resolve(options.manifestPath);
const selectionPath = path.resolve(options.selectionPath);
const outDir = path.resolve(options.outDir);
const manifest = readJson(manifestPath);
const selection = readJson(selectionPath);

if (manifest.schema !== 'frontend-design-boost-image-prompt-pack/v1') {
  fail(`Unsupported prompt-pack manifest schema: ${manifest.schema ?? 'missing'}`);
}
if (selection.schema !== 'frontend-design-boost-asset-selection/v1') {
  fail(`Unsupported asset selection schema: ${selection.schema ?? 'missing'}`);
}

const manifestAssets = new Map((manifest.assets ?? []).map((asset) => [asset.id, asset]));
const targets = selection.implementationTargets ?? [];
const assets = targets.map((target) => {
  const assetId = target.assetId ?? target.id;
  const outputPath = target.outputPath ?? '';
  const absoluteOutputPath = path.resolve(root, outputPath);
  const exists = existsSync(absoluteOutputPath);
  const dimensions = exists ? parsePngDimensions(absoluteOutputPath) : null;
  const stats = exists ? statSync(absoluteOutputPath) : null;
  const manifestAsset = manifestAssets.get(assetId);
  const status = exists && dimensions ? 'available' : 'pending';

  return {
    id: assetId,
    label: target.label ?? manifestAsset?.label ?? assetId,
    slot: target.slot ?? target.role ?? manifestAsset?.useCase ?? '',
    status,
    outputPath,
    projectPath: target.projectPath ?? '',
    declaredSize: target.size ?? manifestAsset?.size ?? '',
    dimensions: dimensions ?? null,
    bytes: stats?.size ?? 0,
    prompt: manifestAsset?.prompt ?? '',
    extractionChecklist: buildExtractionChecklist(target, manifestAsset)
  };
});

const availableCount = assets.filter((asset) => asset.status === 'available').length;
const pendingCount = assets.length - availableCount;
const summary = {
  assetCount: assets.length,
  availableCount,
  pendingCount
};

mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'asset-intake-report.json');
const markdownPath = path.join(outDir, 'asset-intake.md');
const report = {
  schema: 'frontend-design-boost-asset-intake/v1',
  ok: true,
  executed: false,
  generatedAt: new Date().toISOString(),
  manifestPath: relativePath(manifestPath),
  selectionPath: relativePath(selectionPath),
  reportPath: relativePath(reportPath),
  markdownPath: relativePath(markdownPath),
  sourceBrief: manifest.sourceBrief ?? '',
  sourceReferenceIntake: manifest.sourceReferenceIntake ?? '',
  assetCount: summary.assetCount,
  availableCount,
  pendingCount,
  designExtractionPolicy: 'Do not treat generated images as implementation truth; extract design decisions before coding.',
  sections: [
    'Design Extraction',
    'Implementation Handoff',
    'Pending Assets'
  ],
  implementationHandoff: [
    'Use project-local asset paths only.',
    'Keep pending assets behind fallbacks until smoke validation passes.',
    'Run screenshot QA after wiring accepted assets into HTML, React, or Tailwind surfaces.'
  ],
  assets
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown({ manifest, selection, assets, summary }), 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
