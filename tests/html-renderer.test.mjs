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
  assert.match(html, /<canvas id="bg-dark" class="bg"><\/canvas>/);
  assert.match(html, /<div id="deck" class="deck theme-indigo-porcelain" data-renderer="html-guizang" data-guizang-theme="indigo-porcelain">/);
  assert.match(html, /<div id="nav"><\/div>/);
  assert.match(html, /data-slide-index="1"/);
  assert.match(html, /addEventListener\('keydown'/);
  assert.match(html, /import\('\.\/assets\/motion\.min\.js'\)/);
});

test('renderHtmlDeck injects contract slides into the vendored guizang template shell', () => {
  const html = renderHtmlDeck({
    title: 'Vendored Template',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      { id: 'cover', role: 'cover', headline: 'Vendored Template', body: 'Preview', evidence_refs: [], layout_intent: 'hero_dark' }
    ]
  });

  assert.match(html, /<canvas id="bg-dark" class="bg"><\/canvas>/);
  assert.match(html, /<div id="deck"[^>]*data-renderer="html-guizang"[^>]*data-guizang-theme="indigo-porcelain"/);
  assert.match(html, /<div id="nav"><\/div>/);
  assert.match(html, /class="slide hero dark\b/);
  assert.match(html, /data-animate="hero"/);
  assert.doesNotMatch(html, /<!-- SLIDES_HERE -->/);
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

  assert.match(html, /class="slide light slide-content layout-text-split"/);
  assert.match(html, /data-layout="text-split"/);
  assert.match(html, /#deck\[data-renderer\] \.layout-text-split \.slide-copy/);
  assert.match(html, /grid-template-columns: minmax\(0, 0\.78fr\) minmax\(0, 1fr\)/);
  assert.match(html, /#deck\[data-renderer\] \.layout-text-split h2 \{[^}]*font-size: clamp\(2rem, 4\.2vw, 4rem\)/);
  assert.match(html, /#deck\[data-renderer\] \.slide-kicker \{[^}]*display: inline-block/);
  assert.match(html, /overflow-wrap: anywhere/);
  assert.doesNotMatch(html, /template\.html/);
  assert.match(html, /import\('\.\/assets\/motion\.min\.js'\)/);
  assert.doesNotMatch(html, /<script src=/);
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

  assert.match(html, /#deck\[data-renderer\] \.slide-kicker \{[^}]*justify-self: start/);
  assert.match(html, /#deck\[data-renderer\] \.slide-content:not\(\.layout-text-split\) h2, #deck\[data-renderer\] \.slide-evidence h2 \{[^}]*font-size: clamp\(2rem, 5vw, 4\.6rem\)/);
  assert.match(html, /#deck\[data-renderer\] \.slide-content:not\(\.layout-text-split\) \.slide-copy, #deck\[data-renderer\] \.slide-evidence \.slide-copy \{[^}]*align-content: center/);
});

test('renderHtmlDeck renders markdown table blocks as html tables', () => {
  const html = renderHtmlDeck({
    title: 'Report Table',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      {
        id: 's01',
        role: 'content',
        headline: 'Candidate Table',
        body: [
          'The summary remains readable.',
          '',
          '| Rank | Symbol | Score |',
          '|---:|---|---:|',
          '| 1 | `000988.SZ` | 75.05 |'
        ].join('\n'),
        evidence_refs: [],
        layout_intent: 'evidence'
      }
    ]
  });

  assert.match(html, /<p>The summary remains readable\.<\/p>/);
  assert.match(html, /<div class="table-wrap">/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>Rank<\/th>/);
  assert.match(html, /<td><code>000988\.SZ<\/code><\/td>/);
  assert.doesNotMatch(html, /<p>\| Rank \| Symbol \| Score \|/);
});

test('renderHtmlDeck renders structured and legacy evidence references', () => {
  const html = renderHtmlDeck({
    title: 'Evidence Deck',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      {
        id: 's01',
        role: 'content',
        headline: 'Evidence-backed Claim',
        body: 'The claim stays grounded.',
        evidence_refs: [
          'primary',
          { id: 'ev1', source_ref: 'primary', locator: 'p. 2', quote: 'Verified claim.' }
        ],
        layout_intent: 'evidence'
      }
    ]
  });

  assert.match(html, /class="slide-evidence-refs"/);
  assert.match(html, /<div class="slide-evidence-ref">source: primary<\/div>/);
  assert.match(html, /ev1 \| source: primary \| p\. 2 \| Verified claim\./);
  assert.match(html, /#deck\[data-renderer\] \.slide-evidence-refs \{[^}]*max-height: min\(15vh, 132px\)/);
  assert.match(html, /#deck\[data-renderer\] \.slide-evidence-ref \{[^}]*-webkit-line-clamp: 2/);
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
