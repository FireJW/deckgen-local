import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  buildBrowserLaunchOptions,
  findHtmlArtifactForRunDir,
  parseViewportOption,
  validateVisualSmokeResult
} from '../src/qc/html-visual-smoke.mjs';

test('validateVisualSmokeResult accepts nonempty deck screenshots with expected slides', () => {
  const result = validateVisualSmokeResult({
    title: 'Deck Generator Briefing',
    renderer: 'html-guizang',
    slideCount: 4,
    textLength: 320,
    overflowItems: [],
    deckElementPresent: true,
    navElementPresent: true,
    backgroundCanvasCount: 2,
    localMotionImportPresent: true,
    localMotionAssetBytes: 12400,
    externalScriptSrcs: [],
    screenshotPath: '.tmp/deckgen-visual-smoke/briefing.png',
    screenshotBytes: 12400
  }, {
    expectedTitle: 'Deck Generator Briefing',
    expectedSlides: 4
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test('validateVisualSmokeResult accepts Swiss renderer markers', () => {
  const result = validateVisualSmokeResult({
    title: 'Swiss Briefing',
    renderer: 'html-guizang-swiss',
    slideCount: 3,
    textLength: 120,
    overflowItems: [],
    deckElementPresent: true,
    navElementPresent: true,
    backgroundCanvasCount: 1,
    hasSwissLayouts: true,
    localMotionImportPresent: true,
    localMotionAssetBytes: 12400,
    externalScriptSrcs: [],
    screenshotPath: '.tmp/deckgen-visual-smoke/swiss.png',
    screenshotBytes: 12400
  }, {
    expectedTitle: 'Swiss Briefing',
    expectedSlides: 3
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test('validateVisualSmokeResult rejects missing guizang shell and local assets', () => {
  const result = validateVisualSmokeResult({
    title: 'Deck Generator Briefing',
    renderer: 'html-guizang',
    slideCount: 4,
    textLength: 320,
    overflowItems: [],
    deckElementPresent: false,
    navElementPresent: false,
    backgroundCanvasCount: 0,
    localMotionImportPresent: false,
    localMotionAssetBytes: 0,
    externalScriptSrcs: ['https://unpkg.com/lucide@latest/dist/umd/lucide.min.js'],
    screenshotPath: '.tmp/deckgen-visual-smoke/briefing.png',
    screenshotBytes: 12400
  }, {
    expectedTitle: 'Deck Generator Briefing',
    expectedSlides: 4
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /guizang deck element is missing/);
  assert.match(result.errors.join('\n'), /guizang navigation element is missing/);
  assert.match(result.errors.join('\n'), /background canvas count 0 is below 2/);
  assert.match(result.errors.join('\n'), /local motion import is missing/);
  assert.match(result.errors.join('\n'), /local motion asset is missing/);
  assert.match(result.errors.join('\n'), /external script src is not allowed/);
});

test('validateVisualSmokeResult rejects Swiss decks without registered layout markers', () => {
  const result = validateVisualSmokeResult({
    title: 'Swiss Briefing',
    renderer: 'html-guizang-swiss',
    slideCount: 2,
    textLength: 120,
    overflowItems: [],
    deckElementPresent: true,
    navElementPresent: true,
    backgroundCanvasCount: 1,
    hasSwissLayouts: false,
    localMotionImportPresent: true,
    localMotionAssetBytes: 12400,
    externalScriptSrcs: [],
    screenshotPath: '.tmp/deckgen-visual-smoke/swiss.png',
    screenshotBytes: 12400
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /registered data-layout markers/);
});

test('validateVisualSmokeResult rejects empty or visibly broken decks', () => {
  const result = validateVisualSmokeResult({
    title: '',
    renderer: '',
    slideCount: 0,
    textLength: 0,
    overflowItems: [{ selector: '.slide h2', text: 'Long headline' }],
    deckElementPresent: false,
    navElementPresent: false,
    backgroundCanvasCount: 0,
    localMotionImportPresent: false,
    localMotionAssetBytes: 0,
    externalScriptSrcs: [],
    screenshotPath: '',
    screenshotBytes: 0
  }, {
    expectedTitle: 'Deck Generator Briefing',
    expectedSlides: 4
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /title is empty/);
  assert.match(result.errors.join('\n'), /slide count 0 does not match expected 4/);
  assert.match(result.errors.join('\n'), /page text is empty/);
  assert.match(result.errors.join('\n'), /1 text element/);
  assert.match(result.errors.join('\n'), /screenshot is missing/);
});

test('buildBrowserLaunchOptions uses an explicit browser executable when provided', () => {
  assert.deepEqual(
    buildBrowserLaunchOptions({ browserExecutable: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' }),
    {
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    }
  );
});

test('parseViewportOption defaults to desktop smoke dimensions', () => {
  assert.deepEqual(parseViewportOption(), { width: 1440, height: 900 });
});

test('parseViewportOption accepts explicit width by height dimensions', () => {
  assert.deepEqual(parseViewportOption('390x844'), { width: 390, height: 844 });
  assert.deepEqual(parseViewportOption(' 768X1024 '), { width: 768, height: 1024 });
});

test('parseViewportOption rejects malformed viewport dimensions', () => {
  assert.throws(() => parseViewportOption('390'), /--viewport must use WIDTHxHEIGHT/);
  assert.throws(() => parseViewportOption('0x844'), /--viewport width and height must be positive integers/);
  assert.throws(() => parseViewportOption('390x1.5'), /--viewport must use WIDTHxHEIGHT/);
});

test('findHtmlArtifactForRunDir resolves html/index.html from a deckgen run directory', () => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-html-run-dir-'));
  const htmlPath = path.join(runDir, 'html', 'index.html');
  mkdirSync(path.dirname(htmlPath), { recursive: true });
  writeFileSync(htmlPath, '<!doctype html><title>Deck</title>', 'utf8');

  assert.equal(findHtmlArtifactForRunDir(runDir), htmlPath);
});
