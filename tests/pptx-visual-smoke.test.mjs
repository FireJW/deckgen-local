import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildPowerPointExportScript,
  defaultPptxScreenshotPath,
  exportFirstSlideWithPowerPoint,
  resolvePowerPointExecutable
} from '../src/qc/pptx-visual-smoke.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'pptx-visual-smoke.mjs');

const makePngHeader = (width, height) => {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 2;
  return buffer;
};

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

test('resolvePowerPointExecutable accepts an explicit executable path', () => {
  const executablePath = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE';

  assert.equal(resolvePowerPointExecutable({
    executablePath,
    exists: () => true
  }), executablePath);
});

test('buildPowerPointExportScript escapes paths and exports slide one as png', () => {
  const script = buildPowerPointExportScript({
    pptxPath: "D:\\Decks\\owner's deck.pptx",
    screenshotPath: "D:\\Decks\\slide'shot.png",
    width: 1600,
    height: 900
  });

  assert.match(script, /New-Object -ComObject PowerPoint\.Application/);
  assert.match(script, /\$presentation\.Slides\.Item\(1\)\.Export\(\$out, 'PNG', 1600, 900\)/);
  assert.match(script, /owner''s deck\.pptx/);
  assert.match(script, /slide''shot\.png/);
});

test('buildPowerPointExportScript exports a requested slide as png', () => {
  const script = buildPowerPointExportScript({
    pptxPath: 'D:\\Decks\\deck.pptx',
    screenshotPath: 'D:\\Decks\\slide3.png',
    slideNumber: 3,
    width: 1280,
    height: 720
  });

  assert.match(script, /\$presentation\.Slides\.Item\(3\)\.Export\(\$out, 'PNG', 1280, 720\)/);
});

test('defaultPptxScreenshotPath includes the requested slide number', () => {
  const screenshotPath = defaultPptxScreenshotPath('D:\\Decks\\deck.pptx', 'D:\\workspace', 4);

  assert.match(screenshotPath, /deck-.*-slide4\.png$/);
});

test('pptx visual smoke script rejects slide numbers beyond the deck count', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-cli-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  writeFileSync(pptxPath, createMinimalPptxBytes(2));

  const run = spawnSync(process.execPath, [
    script,
    '--pptx', pptxPath,
    '--slide', '3'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  assert.match(run.stderr, /--slide 3 exceeds PPTX slide count 2/);
});

test('exportFirstSlideWithPowerPoint returns a real screenshot artifact when export succeeds', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  const screenshotPath = path.join(dir, 'slide1.png');
  writeFileSync(pptxPath, 'fake pptx bytes');

  const result = exportFirstSlideWithPowerPoint({
    pptxPath,
    screenshotPath,
    powerPointPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    slideNumber: 3,
    exists: () => true,
    spawn: () => {
      mkdirSync(path.dirname(screenshotPath), { recursive: true });
      writeFileSync(screenshotPath, makePngHeader(1600, 900));
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.renderer, 'powerpoint');
  assert.equal(result.slideNumber, 3);
  assert.equal(result.screenshotPath, screenshotPath);
  assert.equal(result.screenshotBytes, 33);
  assert.equal(result.screenshotMime, 'image/png');
  assert.equal(result.imageWidth, 1600);
  assert.equal(result.imageHeight, 900);
});

test('exportFirstSlideWithPowerPoint rejects non-png screenshot artifacts', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  const screenshotPath = path.join(dir, 'slide1.png');
  writeFileSync(pptxPath, 'fake pptx bytes');

  assert.throws(() => exportFirstSlideWithPowerPoint({
    pptxPath,
    screenshotPath,
    powerPointPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    exists: () => true,
    spawn: () => {
      mkdirSync(path.dirname(screenshotPath), { recursive: true });
      writeFileSync(screenshotPath, 'not a png', 'utf8');
      return { status: 0, stdout: '', stderr: '' };
    }
  }), /not a PNG/i);
});
