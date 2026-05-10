import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectPptxFile, validatePptxSmokeResult } from '../src/qc/pptx-structural-smoke.mjs';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'pptx-structural-smoke.mjs');

const createMinimalPptxBytes = (slideCount = 3) => {
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

const writePptxFixture = (slideCount = 3) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-smoke-'));
  mkdirSync(dir, { recursive: true });
  const pptxPath = path.join(dir, 'sample.pptx');
  writeFileSync(pptxPath, createMinimalPptxBytes(slideCount));
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
