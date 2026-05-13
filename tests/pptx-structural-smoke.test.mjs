import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import {
  findLatestPptxArtifact,
  findLatestPptxArtifactForRunDir,
  inferExpectedTextForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from '../src/qc/pptx-structural-smoke.mjs';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'pptx-structural-smoke.mjs');

const createMinimalPptxBytes = (slideCount = 3, options = {}) => {
  const textBySlide = options.textBySlide ?? [];
  const entries = [
    { name: '[Content_Types].xml', data: '' },
    { name: 'ppt/presentation.xml', data: '' },
    ...Array.from({ length: slideCount }, (_, index) => ({
      name: `ppt/slides/slide${index + 1}.xml`,
      data: textBySlide[index] ? `<p:sld><a:t>${textBySlide[index]}</a:t></p:sld>` : ''
    }))
  ];
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const entryName = entry.name;
    const name = Buffer.from(entryName, 'utf8');
    const data = Buffer.from(entry.data, 'utf8');
    const compressedData = options.compress && data.length > 0 ? deflateRawSync(data) : data;
    const compressionMethod = compressedData.length === data.length ? 0 : 8;
    const local = Buffer.alloc(30 + name.length + compressedData.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(compressionMethod, 8);
    local.writeUInt32LE(compressedData.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    compressedData.copy(local, 30 + name.length);
    localParts.push(local);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(compressionMethod, 10);
    central.writeUInt32LE(compressedData.length, 20);
    central.writeUInt32LE(data.length, 24);
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

const writePptxFixture = (slideCount = 3, options = {}) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-smoke-'));
  mkdirSync(dir, { recursive: true });
  const pptxPath = path.join(dir, 'sample.pptx');
  writeFileSync(pptxPath, createMinimalPptxBytes(slideCount, options));
  return pptxPath;
};

const writePptxInDirectory = (dir, name, slideCount, mtime, options = {}) => {
  const pptxPath = path.join(dir, name);
  writeFileSync(pptxPath, createMinimalPptxBytes(slideCount, options));
  utimesSync(pptxPath, mtime, mtime);
  return pptxPath;
};

test('inspectPptxFile reads slide count from a valid pptx package', () => {
  const pptxPath = writePptxFixture(3);
  const summary = inspectPptxFile(pptxPath);

  assert.equal(summary.ok, true);
  assert.equal(summary.path, pptxPath);
  assert.equal(summary.slideCount, 3);
  assert.equal(summary.hasContentTypes, true);
  assert.equal(summary.hasPresentation, true);
});

test('inspectPptxFile extracts text from pptx slide xml entries', () => {
  const pptxPath = writePptxFixture(2, {
    textBySlide: ['Quarterly &amp; Outlook', 'Revenue bridge'],
    compress: true
  });
  const summary = inspectPptxFile(pptxPath);

  assert.equal(summary.ok, true);
  assert.deepEqual(summary.slideTexts, ['Quarterly & Outlook', 'Revenue bridge']);
});

test('validatePptxSmokeResult rejects invalid packages and slide mismatches', () => {
  const mismatch = validatePptxSmokeResult({
    ok: true,
    path: 'sample.pptx',
    slideCount: 2,
    hasContentTypes: true,
    hasPresentation: true
  }, { expectedSlides: 3 });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.errors.join('\n'), /slide count 2 does not match expected 3/);

  const invalid = validatePptxSmokeResult({
    ok: false,
    path: 'invalid.pptx',
    error: 'missing end of central directory'
  }, { expectedSlides: 3 });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join('\n'), /invalid pptx/i);
});

test('validatePptxSmokeResult rejects missing expected pptx text', () => {
  const validation = validatePptxSmokeResult({
    ok: true,
    path: 'sample.pptx',
    bytes: 10,
    slideCount: 2,
    slideTexts: ['Deck Generator Briefing', 'Revenue bridge']
  }, {
    expectedText: ['Deck Generator Briefing', 'Missing thesis']
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /Missing thesis/);
});

test('validatePptxSmokeResult normalizes pptx bullet glyphs when checking expected text', () => {
  const validation = validatePptxSmokeResult({
    ok: true,
    path: 'sample.pptx',
    bytes: 10,
    slideCount: 1,
    slideTexts: ['HTML preview and PPTX export should share one \u2022 content contract.']
  }, {
    expectedText: ['HTML preview and PPTX export should share one content contract.']
  });

  assert.equal(validation.ok, true, validation.errors.join('\n'));
});

test('findLatestPptxArtifact discovers the newest pptx in an exports directory', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-exports-'));
  writeFileSync(path.join(dir, 'notes.txt'), 'ignore me');
  const older = writePptxInDirectory(dir, 'older.pptx', 2, new Date('2026-05-10T00:00:00Z'));
  const newer = writePptxInDirectory(dir, 'newer.PPTX', 4, new Date('2026-05-10T00:01:00Z'));

  assert.equal(findLatestPptxArtifact(dir), newer);
  assert.notEqual(findLatestPptxArtifact(dir), older);
});

test('findLatestPptxArtifactForRunDir discovers the newest pptx under ppt-master exports', () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-run-dir-'));
  const exportsDir = path.join(runDir, 'ppt-master', 'exports');
  mkdirSync(exportsDir, { recursive: true });
  const latest = writePptxInDirectory(exportsDir, 'run-latest.pptx', 6, new Date('2026-05-10T00:03:00Z'));

  assert.equal(findLatestPptxArtifactForRunDir(runDir), latest);
});

test('pptx structural smoke script validates expected slide count', () => {
  const pptxPath = writePptxFixture(4);
  const run = spawnSync(process.execPath, [
    script,
    '--pptx', pptxPath,
    '--expected-slides', '4'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.slideCount, 4);
  assert.deepEqual(result.errors, []);

  const mismatch = spawnSync(process.execPath, [
    script,
    '--pptx', pptxPath,
    '--expected-slides', '3'
  ], { encoding: 'utf8' });

  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stdout, /slide count 4 does not match expected 3/);
});

test('pptx structural smoke script validates expected text content', () => {
  const pptxPath = writePptxFixture(2, {
    textBySlide: ['Deck Generator Briefing', 'Revenue bridge'],
    compress: true
  });
  const run = spawnSync(process.execPath, [
    script,
    '--pptx', pptxPath,
    '--expected-text', 'Deck Generator Briefing',
    '--expected-text', 'Revenue bridge'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true);
  assert.deepEqual(result.expectedText, ['Deck Generator Briefing', 'Revenue bridge']);
  assert.deepEqual(result.errors, []);

  const mismatch = spawnSync(process.execPath, [
    script,
    '--pptx', pptxPath,
    '--expected-text', 'Missing thesis'
  ], { encoding: 'utf8' });

  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stdout, /Missing thesis/);
});

test('inferExpectedTextForRunDir derives title, headlines, and body text from the deck contract', () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-text-contract-'));
  const exportsDir = path.join(runDir, 'ppt-master', 'exports');
  mkdirSync(exportsDir, { recursive: true });
  writePptxInDirectory(exportsDir, 'run-latest.pptx', 2, new Date('2026-05-10T00:03:00Z'));
  writeFileSync(path.join(runDir, 'deck_contract.json'), `${JSON.stringify({
    schema_version: 'deck-contract/v1',
    title: 'PPTX Text Deck',
    audience: 'operators',
    profile: 'briefing',
    duration_minutes: 8,
    target_slide_count: 2,
    language: 'zh-CN',
    source_refs: [],
    hard_constraints: [],
    theme: { renderer_hint: 'indigo_porcelain' },
    outputs: ['pptx'],
    slides: [
      {
        id: 's01',
        role: 'cover',
        headline: 'PPTX Text Deck',
        body: 'Body',
        evidence_refs: [],
        layout_intent: 'hero_dark'
      },
      {
        id: 's02',
        role: 'content',
        headline: 'Key topic',
        body: 'More body',
        evidence_refs: [],
        layout_intent: 'evidence'
      }
    ]
  }, null, 2)}\n`, 'utf8');

  assert.deepEqual(inferExpectedTextForRunDir(runDir), ['PPTX Text Deck', 'Body', 'Key topic', 'More body']);
});

test('pptx structural smoke script validates expected text inferred from the run contract', () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-text-contract-cli-'));
  const exportsDir = path.join(runDir, 'ppt-master', 'exports');
  mkdirSync(exportsDir, { recursive: true });
  writePptxInDirectory(exportsDir, 'run-latest.pptx', 2, new Date('2026-05-10T00:03:00Z'), {
    textBySlide: ['PPTX Text Deck Body', 'Key topic More body']
  });
  writeFileSync(path.join(runDir, 'deck_contract.json'), `${JSON.stringify({
    schema_version: 'deck-contract/v1',
    title: 'PPTX Text Deck',
    audience: 'operators',
    profile: 'briefing',
    duration_minutes: 8,
    target_slide_count: 2,
    language: 'zh-CN',
    source_refs: [],
    hard_constraints: [],
    theme: { renderer_hint: 'indigo_porcelain' },
    outputs: ['pptx'],
    slides: [
      {
        id: 's01',
        role: 'cover',
        headline: 'PPTX Text Deck',
        body: 'Body',
        evidence_refs: [],
        layout_intent: 'hero_dark'
      },
      {
        id: 's02',
        role: 'content',
        headline: 'Key topic',
        body: 'More body',
        evidence_refs: [],
        layout_intent: 'evidence'
      }
    ]
  }, null, 2)}\n`, 'utf8');

  const run = spawnSync(process.execPath, [
    script,
    '--run-dir', runDir,
    '--expected-text-from-contract'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.expectedText, ['PPTX Text Deck', 'Body', 'Key topic', 'More body']);
});

test('pptx structural smoke script accepts an exports directory', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-exports-cli-'));
  writePptxInDirectory(dir, 'latest.pptx', 5, new Date('2026-05-10T00:02:00Z'));

  const run = spawnSync(process.execPath, [
    script,
    '--exports-dir', dir,
    '--expected-slides', '5'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.slideCount, 5);
  assert.match(result.path, /latest\.pptx$/);
});

test('pptx structural smoke script accepts a deckgen run directory', () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-run-cli-'));
  const exportsDir = path.join(runDir, 'ppt-master', 'exports');
  mkdirSync(exportsDir, { recursive: true });
  writePptxInDirectory(exportsDir, 'run-latest.pptx', 6, new Date('2026-05-10T00:03:00Z'));

  const run = spawnSync(process.execPath, [
    script,
    '--run-dir', runDir,
    '--expected-slides', '6'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true);
  assert.equal(result.slideCount, 6);
  assert.match(result.path, /run-latest\.pptx$/);
});

test('pptx structural smoke script infers expected slide count from a deckgen run contract', () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-run-contract-'));
  const exportsDir = path.join(runDir, 'ppt-master', 'exports');
  mkdirSync(exportsDir, { recursive: true });
  writePptxInDirectory(exportsDir, 'run-latest.pptx', 5, new Date('2026-05-10T00:03:00Z'));
  writeFileSync(path.join(runDir, 'deck_contract.json'), `${JSON.stringify({
    schema_version: 'deck-contract/v1',
    title: 'Mismatch deck',
    audience: 'operators',
    profile: 'briefing',
    duration_minutes: 8,
    target_slide_count: 6,
    language: 'zh-CN',
    source_refs: [],
    hard_constraints: [],
    theme: { renderer_hint: 'indigo_porcelain' },
    outputs: ['pptx'],
    slides: Array.from({ length: 6 }, (_, index) => ({
      id: `s${String(index + 1).padStart(2, '0')}`,
      role: index === 0 ? 'cover' : 'content',
      headline: `Slide ${index + 1}`,
      body: 'Body',
      evidence_refs: [],
      layout_intent: index === 0 ? 'hero_dark' : 'evidence'
    }))
  }, null, 2)}\n`, 'utf8');

  const run = spawnSync(process.execPath, [
    script,
    '--run-dir', runDir
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  assert.match(run.stdout, /slide count 5 does not match expected 6/);
});
