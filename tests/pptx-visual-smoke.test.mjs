import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildPowerPointExportScript,
  exportFirstSlideWithPowerPoint,
  resolvePowerPointExecutable
} from '../src/qc/pptx-visual-smoke.mjs';

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

test('exportFirstSlideWithPowerPoint returns a real screenshot artifact when export succeeds', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-pptx-visual-'));
  const pptxPath = path.join(dir, 'deck.pptx');
  const screenshotPath = path.join(dir, 'slide1.png');
  writeFileSync(pptxPath, 'fake pptx bytes');

  const result = exportFirstSlideWithPowerPoint({
    pptxPath,
    screenshotPath,
    powerPointPath: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
    exists: () => true,
    spawn: () => {
      mkdirSync(path.dirname(screenshotPath), { recursive: true });
      writeFileSync(screenshotPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.renderer, 'powerpoint');
  assert.equal(result.screenshotPath, screenshotPath);
  assert.equal(result.screenshotBytes, 8);
});
