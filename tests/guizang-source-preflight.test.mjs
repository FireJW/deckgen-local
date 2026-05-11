import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildGuizangPreflightResult,
  inspectGuizangSourcePath
} from '../src/integrations/guizang-ppt-skill.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'guizang-source-preflight.mjs');

const crcTable = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeStoredZip = (archivePath, entries) => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, content] of entries) {
    const nameBuffer = Buffer.from(name, 'utf8');
    const contentBuffer = Buffer.from(content, 'utf8');
    const checksum = crc32(contentBuffer);
    const localHeader = Buffer.alloc(30 + nameBuffer.length);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(33, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(contentBuffer.length, 18);
    localHeader.writeUInt32LE(contentBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuffer.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + nameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(33, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(contentBuffer.length, 20);
    centralHeader.writeUInt32LE(contentBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuffer.copy(centralHeader, 46);

    localParts.push(localHeader, contentBuffer);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBuffer.length;
  }

  const centralStart = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(centralStart, 16);
  endRecord.writeUInt16LE(0, 20);

  writeFileSync(archivePath, Buffer.concat([...localParts, centralDirectory, endRecord]));
};

const makeGuizangFixture = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-guizang-source-'));
  mkdirSync(path.join(dir, 'assets'), { recursive: true });
  writeFileSync(path.join(dir, 'LICENSE'), 'MIT License\nCopyright (c) 2026 op7418\n', 'utf8');
  writeFileSync(path.join(dir, 'README.md'), '# guizang-ppt-skill\n', 'utf8');
  writeFileSync(path.join(dir, 'assets', 'template.html'), '<!doctype html><title>Guizang</title>', 'utf8');
  return dir;
};

test('inspectGuizangSourcePath accepts a local source with license and template', () => {
  const sourcePath = makeGuizangFixture();
  const result = inspectGuizangSourcePath(sourcePath);

  assert.equal(result.ok, true);
  assert.equal(result.sourcePath, sourcePath);
  assert.match(result.licensePath, /LICENSE$/);
  assert.match(result.templatePath, /assets[\\/]template\.html$/);
});

test('inspectGuizangSourcePath accepts a local guizang zip archive', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-guizang-zip-source-'));
  const archivePath = path.join(tempDir, 'guizang-ppt-skill-main.zip');
  writeStoredZip(archivePath, [
    ['guizang-ppt-skill-main/LICENSE', 'MIT License\nCopyright (c) 2026 op7418\n'],
    ['guizang-ppt-skill-main/assets/template.html', '<!doctype html><title>Guizang</title>'],
    ['guizang-ppt-skill-main/assets/motion.min.js', 'window.Motion = {};']
  ]);

  const result = inspectGuizangSourcePath(archivePath);

  assert.equal(result.ok, true);
  assert.equal(result.sourceKind, 'zip-archive');
  assert.equal(result.sourcePath, archivePath);
  assert.equal(result.archiveRoot, 'guizang-ppt-skill-main/');
  assert.match(result.licensePath, /guizang-ppt-skill-main\/LICENSE$/);
  assert.match(result.templatePath, /guizang-ppt-skill-main\/assets\/template\.html$/);
});

test('inspectGuizangSourcePath reports swiss template and validator support', () => {
  const sourceDir = makeGuizangFixture();
  mkdirSync(path.join(sourceDir, 'scripts'), { recursive: true });
  writeFileSync(path.join(sourceDir, 'assets', 'template-swiss.html'), '<div id="deck"><!-- SLIDES_HERE --></div>', 'utf8');
  writeFileSync(path.join(sourceDir, 'scripts', 'validate-swiss-deck.mjs'), 'process.exit(0);\n', 'utf8');

  const result = inspectGuizangSourcePath(sourceDir);

  assert.equal(result.ok, true);
  assert.equal(result.hasSwissTemplate, true);
  assert.equal(result.hasSwissValidator, true);
});

test('inspectGuizangSourcePath reports swiss support in zip archives', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-guizang-swiss-zip-source-'));
  const archivePath = path.join(tempDir, 'guizang-ppt-skill-main.zip');
  writeStoredZip(archivePath, [
    ['guizang-ppt-skill-main/LICENSE', 'MIT License\nCopyright (c) 2026 op7418\n'],
    ['guizang-ppt-skill-main/assets/template.html', '<!doctype html><title>Guizang</title>'],
    ['guizang-ppt-skill-main/assets/template-swiss.html', '<!doctype html><title>Swiss</title>'],
    ['guizang-ppt-skill-main/assets/motion.min.js', 'window.Motion = {};'],
    ['guizang-ppt-skill-main/scripts/validate-swiss-deck.mjs', 'process.exit(0);\n']
  ]);

  const result = inspectGuizangSourcePath(archivePath);

  assert.equal(result.ok, true);
  assert.equal(result.hasSwissTemplate, true);
  assert.equal(result.hasSwissValidator, true);
});

test('inspectGuizangSourcePath fails closed when source is missing', () => {
  const result = inspectGuizangSourcePath(path.join(os.tmpdir(), 'missing-guizang-source'));

  assert.equal(result.ok, false);
  assert.match(result.error, /not found/i);
});

test('guizang source preflight script reports actionable missing-source failures', () => {
  const missingPath = path.join(os.tmpdir(), 'missing-guizang-source-cli');
  const run = spawnSync(process.execPath, [
    script,
    '--source', missingPath
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, false);
  assert.match(result.error, /not found/i);
  assert.match(result.next_step, /provide a local guizang-ppt-skill checkout, extracted archive directory, or \.zip archive/i);
});

test('buildGuizangPreflightResult reports invalid zip archives without vendoring files', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-guizang-archive-'));
  const archivePath = path.join(tempDir, 'guizang-ppt-skill.zip');
  writeFileSync(archivePath, 'archive placeholder', 'utf8');

  const result = buildGuizangPreflightResult(archivePath);

  assert.equal(result.ok, false);
  assert.equal(result.sourceKind, 'zip-archive');
  assert.match(result.error, /zip could not be inspected/i);
  assert.match(result.next_step, /checkout, extracted archive directory, or \.zip archive/i);
});
