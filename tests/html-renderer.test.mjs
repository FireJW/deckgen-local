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

test('renderHtmlDeck gives text_split a distinct local layout', () => {
  const html = renderHtmlDeck({
    title: 'Learning Layout',
    theme: { renderer_hint: 'ink_classic' },
    slides: [
      { id: 's01', role: 'content', headline: 'Concept', body: 'Left idea\n\nRight explanation', evidence_refs: [], layout_intent: 'text_split' }
    ]
  });

  assert.match(html, /class="slide slide-content layout-text-split surface-paper"/);
  assert.match(html, /data-layout="text-split"/);
  assert.match(html, /\.layout-text-split \.slide-copy/);
  assert.match(html, /grid-template-columns: minmax\(0, 0\.78fr\) minmax\(0, 1fr\)/);
  assert.match(html, /\.layout-text-split h2 \{[^}]*font-size: clamp\(2rem, 4\.2vw, 4rem\)/);
  assert.match(html, /\.slide-kicker \{[^}]*display: inline-block/);
  assert.match(html, /overflow-wrap: anywhere/);
  assert.doesNotMatch(html, /template\.html/);
  assert.doesNotMatch(html, /motion\.min\.js/);
  assert.doesNotMatch(html, /<script src=/);
  assert.doesNotMatch(html, /assets\//);
});

test('renderHtmlDeck bounds long article content layouts', () => {
  const html = renderHtmlDeck({
    title: 'Article Layout',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      {
        id: 's01',
        role: 'content',
        headline: 'A very long article headline should stay inside the slide instead of pushing body text outside the viewport',
        body: 'A supporting paragraph remains visible inside the slide.',
        evidence_refs: [],
        layout_intent: 'evidence'
      }
    ]
  });

  assert.match(html, /\.slide-kicker \{[^}]*justify-self: start/);
  assert.match(html, /\.slide-content:not\(\.layout-text-split\) h2, \.slide-evidence h2 \{[^}]*font-size: clamp\(2rem, 5vw, 4\.6rem\)/);
  assert.match(html, /\.slide-content:not\(\.layout-text-split\) \.slide-copy, \.slide-evidence \.slide-copy \{[^}]*align-content: center/);
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
