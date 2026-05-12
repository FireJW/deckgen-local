import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  inspectDeckRunBundle,
  validateDeckRunBundleSmokeResult
} from '../src/qc/run-bundle-smoke.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'deck-run-smoke.mjs');

const createMinimalPptxBytes = (slideCount = 2) => {
  const entries = [
    '[Content_Types].xml',
    'ppt/presentation.xml',
    ...Array.from({ length: slideCount }, (_, index) => `ppt/slides/slide${index + 1}.xml`)
  ];
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entryName of entries) {
    const name = Buffer.from(entryName, 'utf8');
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDir, eocd]);
};

const validContract = (outputs = ['html', 'pptx']) => ({
  schema_version: 'deck-contract/v1',
  title: 'Run Smoke Deck',
  audience: 'operators',
  profile: 'briefing',
  duration_minutes: 8,
  target_slide_count: 2,
  language: 'zh-CN',
  source_refs: [],
  hard_constraints: [],
  theme: { renderer_hint: 'indigo_porcelain' },
  slides: [
    {
      id: 's01',
      role: 'cover',
      headline: 'Run Smoke Deck',
      body: 'operators',
      evidence_refs: [],
      layout_intent: 'hero_dark'
    },
    {
      id: 's02',
      role: 'content',
      headline: 'Verified bundle',
      body: 'HTML and PPTX are siblings.',
      evidence_refs: [],
      layout_intent: 'evidence'
    }
  ],
  outputs
});

const makeRunBundle = ({
  outputs = ['html', 'pptx'],
  html = true,
  pptx = true,
  request = true,
  requestOutputs = outputs,
  sourceManifest = true,
  sourceManifestPrimaryPath = 'D:/source.md'
} = {}) => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-run-smoke-'));
  if (request) {
    writeFileSync(path.join(runDir, 'request.json'), `${JSON.stringify({
      command: 'generate',
      source: 'fixtures/generic-markdown/briefing.md',
      source_type: 'generic-markdown',
      profile: 'briefing',
      output: outputs.length === 2 ? 'both' : outputs[0],
      outputs: requestOutputs,
      workdir: path.dirname(runDir)
    }, null, 2)}\n`, 'utf8');
  }
  if (sourceManifest) {
    writeFileSync(path.join(runDir, 'source_manifest.json'), `${JSON.stringify({
      type: 'generic-markdown',
      primary: {
        path: sourceManifestPrimaryPath,
        bytes: 42,
        modified_at: new Date(0).toISOString()
      }
    }, null, 2)}\n`, 'utf8');
  }
  writeFileSync(path.join(runDir, 'content.md'), '# Run Smoke Deck\n\nVerified bundle.', 'utf8');
  writeFileSync(path.join(runDir, 'qc_report.md'), '# QC\n\nvalidation: PASS', 'utf8');
  writeFileSync(path.join(runDir, 'deck_contract.json'), `${JSON.stringify(validContract(outputs), null, 2)}\n`, 'utf8');

  if (html) {
    mkdirSync(path.join(runDir, 'html'), { recursive: true });
    writeFileSync(path.join(runDir, 'html', 'index.html'), '<!doctype html><title>Run Smoke Deck</title>', 'utf8');
  }

  if (pptx) {
    const exportsDir = path.join(runDir, 'ppt-master', 'exports');
    mkdirSync(exportsDir, { recursive: true });
    writeFileSync(path.join(exportsDir, 'deck.pptx'), createMinimalPptxBytes(2));
  }

  return runDir;
};

test('inspectDeckRunBundle validates sibling html and pptx artifacts from the contract outputs', () => {
  const runDir = makeRunBundle();
  const summary = inspectDeckRunBundle({ runDir });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, true, validation.errors.join('\n'));
  assert.equal(summary.expectedSlides, 2);
  assert.equal(summary.html.ok, true);
  assert.equal(summary.pptx.ok, true);
  assert.equal(summary.pptx.slideCount, 2);
});

test('inspectDeckRunBundle fails closed when a requested sibling output is missing', () => {
  const runDir = makeRunBundle({ html: false });
  const summary = inspectDeckRunBundle({ runDir });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /html\/index\.html/i);
});

test('inspectDeckRunBundle fails closed when traceability files are missing', () => {
  const runDir = makeRunBundle({ request: false, sourceManifest: false });
  const summary = inspectDeckRunBundle({ runDir });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /request\.json/i);
  assert.match(validation.errors.join('\n'), /source_manifest\.json/i);
});

test('inspectDeckRunBundle rejects traceability drift in request and source manifest files', () => {
  const outputMismatchRunDir = makeRunBundle({ requestOutputs: ['html'] });
  const outputMismatch = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({
    runDir: outputMismatchRunDir
  }));

  assert.equal(outputMismatch.ok, false);
  assert.match(outputMismatch.errors.join('\n'), /request\.json outputs/i);

  const sourcePathMissingRunDir = makeRunBundle({ sourceManifestPrimaryPath: ' ' });
  const sourcePathMissing = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({
    runDir: sourcePathMissingRunDir
  }));

  assert.equal(sourcePathMissing.ok, false);
  assert.match(sourcePathMissing.errors.join('\n'), /source_manifest\.json primary\.path/i);
});

test('deck-run-smoke script emits json and exits non-zero on invalid bundles', () => {
  const runDir = makeRunBundle({ pptx: false });
  const run = spawnSync(process.execPath, [script, '--run-dir', runDir], {
    encoding: 'utf8'
  });

  assert.notEqual(run.status, 0);
  assert.equal(run.stderr, '');
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /pptx/i);
  assert.match(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'), /"outputs":/);
});
