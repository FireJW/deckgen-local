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
