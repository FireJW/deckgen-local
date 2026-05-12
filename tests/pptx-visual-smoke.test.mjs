import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import {
  buildPowerPointExportScript,
  defaultPptxScreenshotPath,
  exportFirstSlideWithPowerPoint,
  exportSlidesWithPowerPoint,
  inspectPngFile,
  resolvePowerPointExecutable
} from '../src/qc/pptx-visual-smoke.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'pptx-visual-smoke.mjs');

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const makeChunk = (type, data) => {
  const chunk = Buffer.alloc(12 + data.length);
  const name = Buffer.from(type, 'ascii');
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(0, 8 + data.length);
  return chunk;
};

const makePng = (width, height, pixelFn) => {
  const rowStride = width * 4 + 1;
  const raw = Buffer.alloc(rowStride * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowStride;
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelFn(x, y);
      const pixelOffset = rowOffset + 1 + x * 4;
      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    pngSignature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
};

const makeVisiblePng = (width, height) =>
  makePng(width, height, (x, y) => (
    x < Math.max(1, Math.floor(width / 5)) && y < Math.max(1, Math.floor(height / 5))
      ? [0, 0, 0, 255]
      : [255, 255, 255, 255]
  ));

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

test('pptx visual smoke script rejects all-slides with slide option', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-cli-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  writeFileSync(pptxPath, createMinimalPptxBytes(2));

  const run = spawnSync(process.execPath, [
    script,
    '--pptx', pptxPath,
    '--all-slides',
    '--slide', '2'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  assert.match(run.stderr, /--all-slides cannot be combined with --slide/);
});

test('exportSlidesWithPowerPoint returns screenshot artifacts for each requested slide', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-all-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  writeFileSync(pptxPath, 'fake pptx bytes');

  const result = exportSlidesWithPowerPoint({
    pptxPath,
    powerPointPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    slideNumbers: [1, 2, 3],
    exists: (filePath) => filePath === 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE' ||
      filePath === pptxPath ||
      /slide[123]\.png$/.test(filePath),
    spawn: (_command, _args, options) => {
      const scriptText = options.input ?? _args.at(-1);
      for (const slideNumber of [1, 2, 3]) {
        const screenshotPath = path.join(dir, `slide${slideNumber}.png`);
        mkdirSync(path.dirname(screenshotPath), { recursive: true });
        writeFileSync(screenshotPath, makeVisiblePng(1600, 900));
        assert.match(scriptText, new RegExp(`Slides\\.Item\\(${slideNumber}\\)\\.Export`));
      }
      return { status: 0, stdout: '', stderr: '' };
    },
    screenshotPathForSlide: (slideNumber) => path.join(dir, `slide${slideNumber}.png`)
  });

  assert.equal(result.ok, true);
  assert.equal(result.slideCount, 3);
  assert.deepEqual(result.slideNumbers, [1, 2, 3]);
  assert.equal(result.screenshots.length, 3);
  assert.deepEqual(result.screenshots.map((item) => item.slideNumber), [1, 2, 3]);
  assert.ok(result.screenshots.every((item) => item.screenshotBytes > 33));
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
      writeFileSync(screenshotPath, makeVisiblePng(1600, 900));
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.renderer, 'powerpoint');
  assert.equal(result.slideNumber, 3);
  assert.equal(result.screenshotPath, screenshotPath);
  assert.ok(result.screenshotBytes > 33);
  assert.equal(result.screenshotMime, 'image/png');
  assert.equal(result.imageWidth, 1600);
  assert.equal(result.imageHeight, 900);
});

test('exportFirstSlideWithPowerPoint launches powershell in sta mode', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  const screenshotPath = path.join(dir, 'slide1.png');
  writeFileSync(pptxPath, 'fake pptx bytes');
  let capturedArgs = [];

  exportFirstSlideWithPowerPoint({
    pptxPath,
    screenshotPath,
    powerPointPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    exists: () => true,
    spawn: (_command, args) => {
      capturedArgs = args;
      mkdirSync(path.dirname(screenshotPath), { recursive: true });
      writeFileSync(screenshotPath, makeVisiblePng(1600, 900));
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  assert.deepEqual(capturedArgs.slice(0, 4), ['-NoProfile', '-Sta', '-ExecutionPolicy', 'Bypass']);
});

test('inspectPngFile reports pixel stats and rejects blank png screenshots', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-'));
  const visiblePath = path.join(dir, 'visible.png');
  const blankPath = path.join(dir, 'blank.png');
  writeFileSync(visiblePath, makeVisiblePng(8, 8));
  writeFileSync(blankPath, makePng(8, 8, () => [255, 255, 255, 255]));

  const visible = inspectPngFile(visiblePath);
  assert.equal(visible.screenshotMime, 'image/png');
  assert.equal(visible.imageWidth, 8);
  assert.equal(visible.imageHeight, 8);
  assert.ok(visible.pixelUniqueColorCount >= 2);
  assert.ok(visible.pixelBlankRatio > 0);

  assert.throws(() => inspectPngFile(blankPath), /blank|empty|nearly blank/i);
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
