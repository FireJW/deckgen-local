#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { inspectPngFile } from '../src/qc/pptx-visual-smoke.mjs';

const root = path.resolve(import.meta.dirname, '..');
const defaultSelectionPath = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack', 'asset-selection.json');
const smokeLabel = 'asset-selection bridge image asset smoke';

const usage = [
  'frontend-design-boost-asset-smoke [--selection <path>] [--asset-id <id>]',
  '',
  'Validate generated frontend-design-boost image assets referenced by asset-selection.json.',
  'Run this after gpt-image assets have been generated into project-local output paths.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { selectionPath: defaultSelectionPath, assetId: '' };

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

    if (flag === '--selection') {
      options.selectionPath = value;
    } else if (flag === '--asset-id') {
      options.assetId = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const relativePath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');

const parseSize = (size) => {
  const match = String(size ?? '').match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
};

const candidateAssetPaths = ({ target, selectionDir }) => {
  const values = [target.projectPath, target.outputPath].filter(Boolean);
  const candidates = [];

  for (const value of values) {
    const resolved = path.isAbsolute(value)
      ? path.resolve(value)
      : path.resolve(selectionDir, value);
    candidates.push(resolved);

    if (!path.isAbsolute(value)) {
      candidates.push(path.resolve(root, value));
    }
  }

  return [...new Set(candidates)];
};

const readSelection = (selectionPath) => {
  if (!existsSync(selectionPath)) {
    fail(`Missing asset selection manifest: ${relativePath(selectionPath)}`);
  }

  try {
    return JSON.parse(readFileSync(selectionPath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${relativePath(selectionPath)}: ${error.message}`);
  }
};

const validateAsset = ({ target, selectionDir }) => {
  const candidates = candidateAssetPaths({ target, selectionDir });
  const assetPath = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? path.resolve(selectionDir, '');
  const asset = {
    role: target.role,
    assetId: target.assetId,
    assetPath: relativePath(assetPath),
    pathResolution: candidates.map((candidate) => relativePath(candidate)),
    expectedSize: target.size,
    status: target.status
  };
  const errors = [];

  if (!target.role) errors.push('missing asset role');
  if (!target.projectPath && !target.outputPath) errors.push('missing asset path');
  if (!existsSync(assetPath)) {
    errors.push(`missing generated asset: ${relativePath(assetPath)}`);
    return { ...asset, ok: false, errors };
  }

  const bytes = statSync(assetPath).size;
  asset.bytes = bytes;
  if (bytes < 1) errors.push(`empty generated asset: ${relativePath(assetPath)}`);

  try {
    const image = inspectPngFile(assetPath);
    Object.assign(asset, image);
    const expected = parseSize(target.size);
    if (expected && (image.imageWidth !== expected.width || image.imageHeight !== expected.height)) {
      errors.push(`asset dimensions ${image.imageWidth}x${image.imageHeight} do not match expected ${target.size}`);
    }
  } catch (error) {
    errors.push(error.message);
  }

  return {
    ...asset,
    ok: errors.length === 0,
    errors
  };
};

const { selectionPath, assetId } = parseArgs();
const resolvedSelectionPath = path.resolve(selectionPath);
const selection = readSelection(resolvedSelectionPath);
const selectionDir = path.dirname(resolvedSelectionPath);
const targets = Array.isArray(selection.implementationTargets) ? selection.implementationTargets : [];

if (selection.schema !== 'frontend-design-boost-asset-selection/v1') {
  fail(`Unsupported asset selection schema: ${selection.schema ?? '(missing)'}`);
}

if (targets.length < 1) {
  fail('Asset selection manifest has no implementationTargets.');
}

const selectedTargets = assetId ? targets.filter((target) => target.assetId === assetId) : targets;
if (assetId && selectedTargets.length < 1) {
  fail(`No asset selection target found for asset id: ${assetId}`);
}

const assets = selectedTargets.map((target) => validateAsset({ target, selectionDir }));
const errors = assets.flatMap((asset) => asset.errors.map((error) => `${asset.role || asset.assetId || 'asset'}: ${error}`));
const report = {
  ok: errors.length === 0,
  smokeLabel,
  selectionPath: relativePath(resolvedSelectionPath),
  assetId,
  assetCount: assets.length,
  assets,
  errors
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.ok ? 0 : 1);
