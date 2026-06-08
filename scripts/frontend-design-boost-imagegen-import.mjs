#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectPngFile } from '../src/qc/pptx-visual-smoke.mjs';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultHandoffPath = path.join(defaultPackDir, 'imagegen-handoff.json');
const defaultOutDir = defaultPackDir;

const usage = [
  'frontend-design-boost-imagegen-import [--handoff <path>] [--asset-id <id>] [--source <png>] [--source-dir <dir>] [--out-dir <dir>]',
  '',
  'Import built-in imagegen outputs from CODEX_HOME/generated_images or a supplied source PNG into project-local asset paths.',
  'This command copies files into the current repo only; it does not call image generation APIs.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    handoffPath: defaultHandoffPath,
    assetId: '',
    sourcePath: '',
    sourceDir: '',
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

    if (flag === '--handoff') {
      options.handoffPath = value;
    } else if (flag === '--asset-id') {
      options.assetId = value;
    } else if (flag === '--source') {
      options.sourcePath = value;
    } else if (flag === '--source-dir') {
      options.sourceDir = value;
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
  return relative.startsWith('..') ? absolutePath.split(path.sep).join('/') : relative;
};

const isRepoLocal = (filePath) => {
  const relative = path.relative(root, path.resolve(filePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) fail(`Missing ${label}: ${toProjectPath(filePath)}`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${label}: ${error.message}`);
  }
};

const parseSize = (size) => {
  const match = String(size ?? '').match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
};

const codexGeneratedImagesDir = () => {
  const homes = [
    process.env.CODEX_HOME,
    path.resolve(root, '..', '..', 'AppData', 'codex'),
    process.env.APPDATA ? path.join(path.dirname(process.env.APPDATA), 'codex') : '',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'codex') : '',
    process.platform === 'win32' ? path.join(os.homedir(), 'AppData', 'codex') : '',
    path.join(os.homedir(), '.codex')
  ].filter(Boolean);
  const generatedDirs = [...new Set(homes.map((home) => path.join(path.resolve(home), 'generated_images')))];
  return generatedDirs.find((dirPath) => existsSync(dirPath)) ?? generatedDirs[0];
};

const listPngFiles = (dirPath) => {
  if (!dirPath || !existsSync(dirPath)) return [];
  const entries = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listPngFiles(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      entries.push(entryPath);
    }
  }
  return entries;
};

const findSourceForAsset = ({ asset, sourcePath, sourceDir }) => {
  if (sourcePath) return path.resolve(sourcePath);
  const resolvedSourceDir = path.resolve(sourceDir || codexGeneratedImagesDir());
  const targetBase = path.basename(asset.finalAssetPath ?? '', '.png').toLowerCase();
  const assetId = String(asset.id ?? '').toLowerCase();
  const candidates = listPngFiles(resolvedSourceDir);
  return candidates.find((candidate) => {
    const name = path.basename(candidate, path.extname(candidate)).toLowerCase();
    return name === assetId || name === targetBase || name.includes(assetId) || name.includes(targetBase);
  }) ?? '';
};

const validateHandoff = (handoff) => {
  const errors = [];
  if (handoff.schema !== 'frontend-design-boost-imagegen-handoff/v1') {
    errors.push(`unsupported handoff schema: ${handoff.schema ?? 'missing'}`);
  }
  if (handoff.executionMode !== 'codex-built-in-imagegen-handoff') {
    errors.push(`unsupported handoff execution mode: ${handoff.executionMode ?? 'missing'}`);
  }
  if (handoff.model !== 'gpt-image-2') {
    errors.push(`handoff model is ${handoff.model ?? 'missing'}, expected gpt-image-2`);
  }
  if (handoff.requiresOpenAiApiKey !== false) {
    errors.push('handoff does not prove built-in imagegen no-key route');
  }
  if (!Array.isArray(handoff.assets) || handoff.assets.length < 1) {
    errors.push('handoff contains no assets');
  }
  return errors;
};

const importAsset = ({ asset, sourcePath, sourceDir }) => {
  const errors = [];
  const resolvedSourcePath = findSourceForAsset({ asset, sourcePath, sourceDir });
  const resolvedFinalPath = path.resolve(root, asset.finalAssetPath ?? '');
  const expected = parseSize(asset.size);
  const result = {
    assetId: asset.id ?? '',
    label: asset.label ?? '',
    sourcePath: resolvedSourcePath ? toProjectPath(resolvedSourcePath) : '',
    finalAssetPath: toProjectPath(resolvedFinalPath),
    expectedSize: asset.size ?? '',
    copied: false,
    dimensionsMatch: false,
    bytes: 0,
    errors
  };

  if (!asset.id) errors.push('missing asset id');
  if (!asset.finalAssetPath) errors.push('missing final asset path');
  if (!isRepoLocal(resolvedFinalPath)) errors.push(`final asset path must stay inside this repo: ${resolvedFinalPath}`);
  if (!resolvedSourcePath) errors.push(`no source PNG found for asset ${asset.id ?? 'unknown'}`);
  if (resolvedSourcePath && !existsSync(resolvedSourcePath)) {
    errors.push(`source PNG is missing: ${toProjectPath(resolvedSourcePath)}`);
  }

  let image = null;
  if (resolvedSourcePath && existsSync(resolvedSourcePath)) {
    try {
      image = inspectPngFile(resolvedSourcePath);
      Object.assign(result, image);
      result.bytes = statSync(resolvedSourcePath).size;
      result.dimensionsMatch = expected
        ? image.imageWidth === expected.width && image.imageHeight === expected.height
        : true;
      if (!result.dimensionsMatch) {
        errors.push(`source dimensions ${image.imageWidth}x${image.imageHeight} do not match expected ${asset.size}`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (errors.length === 0) {
    mkdirSync(path.dirname(resolvedFinalPath), { recursive: true });
    copyFileSync(resolvedSourcePath, resolvedFinalPath);
    result.copied = true;
  }

  return result;
};

const renderMarkdown = (report) => [
  '# Frontend Design Boost Imagegen Import',
  '',
  `Handoff: \`${report.handoffPath}\``,
  `Route: \`${report.route}\``,
  `Requires OPENAI_API_KEY: ${report.requiresOpenAiApiKey ? 'yes' : 'no'}`,
  `Default built-in output source: \`${report.sourceDefaultDirectory}\``,
  '',
  '## Imported Assets',
  '',
  ...report.assets.flatMap((asset) => [
    `### ${asset.assetId}`,
    '',
    `- Source: \`${asset.sourcePath || 'not found'}\``,
    `- Final asset path: \`${asset.finalAssetPath}\``,
    `- Copied: ${asset.copied ? 'yes' : 'no'}`,
    `- Dimensions match: ${asset.dimensionsMatch ? 'yes' : 'no'}`,
    ...(asset.errors.length ? asset.errors.map((error) => `- Error: ${error}`) : []),
    ''
  ]),
  '## Next Gates',
  '',
  '- Run asset smoke after import.',
  '- Run asset intake and image decision after selected assets are imported.',
  '- Run desktop and mobile screenshot QA after wiring assets into UI code.',
  ''
].join('\n');

const options = parseArgs();
const resolvedHandoffPath = path.resolve(options.handoffPath);
const handoff = readJson(resolvedHandoffPath, 'built-in imagegen handoff');
const handoffErrors = validateHandoff(handoff);
if (handoffErrors.length > 0) fail(handoffErrors.join('\n'));

const selectedAssets = options.assetId
  ? handoff.assets.filter((asset) => asset.id === options.assetId)
  : handoff.assets;
if (selectedAssets.length < 1) fail(`No handoff asset found for id: ${options.assetId}`);
if (options.sourcePath && selectedAssets.length !== 1) {
  fail('--source can only be used when importing one asset with --asset-id.');
}

const outDir = path.resolve(options.outDir);
mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'imagegen-import-report.json');
const markdownPath = path.join(outDir, 'imagegen-import.md');

const assets = selectedAssets.map((asset) => importAsset({
  asset,
  sourcePath: options.sourcePath,
  sourceDir: options.sourceDir
}));
const blockedBy = assets.flatMap((asset) =>
  asset.errors.map((error) => ({
    assetId: asset.assetId,
    error
  }))
);

const report = {
  schema: 'frontend-design-boost-imagegen-import/v1',
  ok: blockedBy.length === 0,
  executed: false,
  imported: assets.some((asset) => asset.copied),
  route: 'built-in-imagegen',
  model: handoff.model ?? '',
  requiresOpenAiApiKey: handoff.requiresOpenAiApiKey,
  sourceDefaultDirectory: handoff.sourceDefaultDirectory ?? 'CODEX_HOME/generated_images',
  handoffPath: toProjectPath(resolvedHandoffPath),
  sourceDir: options.sourceDir ? toProjectPath(path.resolve(options.sourceDir)) : handoff.sourceDefaultDirectory ?? 'CODEX_HOME/generated_images',
  reportPath: toProjectPath(reportPath),
  markdownPath: toProjectPath(markdownPath),
  assets,
  blockedBy,
  nextGates: [
    'Run npm.cmd run smoke:frontend-design-boost:assets.',
    'Run npm.cmd run intake:frontend-design-boost:assets.',
    'Run npm.cmd run decision:frontend-design-boost:image.',
    'Run desktop and mobile screenshot QA after wiring assets into UI code.'
  ],
  generatedAt: new Date().toISOString()
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.ok ? 0 : 1);
