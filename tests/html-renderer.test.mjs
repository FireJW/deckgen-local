import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { renderHtmlDeck } from '../src/renderers/html-guizang/render.mjs';
import { buildQcReport } from '../src/qc/report.mjs';

test('renderHtmlDeck renders a single-file deck', () => {
  const html = renderHtmlDeck({
    title: 'Deck Generator Briefing',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      { id: 's01', role: 'cover', headline: 'Deck Generator Briefing', body: 'Preview', evidence_refs: [], layout_intent: 'hero_dark' }
    ]
  });

  assert.match(html, /<html/);
  assert.match(html, /Deck Generator Briefing/);
  assert.match(html, /class="deck/);
});

test('renderHtmlDeck renders a guizang horizontal shell', () => {
  const html = renderHtmlDeck({
    title: 'Guizang Integration',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      { id: 'cover', role: 'cover', headline: 'Guizang Integration', body: 'Preview', evidence_refs: [], layout_intent: 'hero_dark' },
      { id: 'evidence', role: 'evidence', headline: 'Grounded Output', body: 'HTML and PPTX stay sibling outputs.', evidence_refs: [], layout_intent: 'evidence' }
    ]
  });

  assert.match(html, /data-renderer="html-guizang"/);
  assert.match(html, /data-guizang-theme="indigo-porcelain"/);
  assert.match(html, /class="slide-track"/);
  assert.match(html, /scroll-snap-type: x mandatory/);
  assert.match(html, /data-slide-index="1"/);
  assert.match(html, /aria-label="Go to slide 2"/);
  assert.match(html, /addEventListener\('keydown'/);
  assert.doesNotMatch(html, /motion\.min\.js/);
});

test('renderHtmlDeck maps renderer hints to guizang theme presets', () => {
  const html = renderHtmlDeck({
    title: 'Theme Mapping',
    theme: { renderer_hint: 'forest_ink' },
    slides: []
  });

  assert.match(html, /class="deck theme-forest-ink"/);
  assert.match(html, /--ink:#1a2e1f/);
  assert.match(html, /--paper:#f5f1e8/);
  assert.doesNotMatch(html, /theme-forest_ink/);
});

test('buildQcReport renders source validation and html lines', () => {
  const report = buildQcReport({
    sourcePath: 'fixtures/generic-markdown/briefing.md',
    validation: { ok: true },
    htmlPath: '.tmp/deckgen/run/deck.html'
  });

  assert.match(report, /^source: fixtures\/generic-markdown\/briefing\.md/m);
  assert.match(report, /^validation: PASS/m);
  assert.match(report, /^html: \.tmp\/deckgen\/run\/deck\.html/m);
});
