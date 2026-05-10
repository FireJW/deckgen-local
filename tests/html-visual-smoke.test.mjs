import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildBrowserLaunchOptions, validateVisualSmokeResult } from '../src/qc/html-visual-smoke.mjs';

test('validateVisualSmokeResult accepts nonempty deck screenshots with expected slides', () => {
  const result = validateVisualSmokeResult({
    title: 'Deck Generator Briefing',
    renderer: 'html-guizang',
    slideCount: 4,
    textLength: 320,
    overflowItems: [],
    screenshotPath: '.tmp/deckgen-visual-smoke/briefing.png',
    screenshotBytes: 12400
  }, {
    expectedTitle: 'Deck Generator Briefing',
    expectedSlides: 4
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test('validateVisualSmokeResult rejects empty or visibly broken decks', () => {
  const result = validateVisualSmokeResult({
    title: '',
    renderer: '',
    slideCount: 0,
    textLength: 0,
    overflowItems: [{ selector: '.slide h2', text: 'Long headline' }],
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
