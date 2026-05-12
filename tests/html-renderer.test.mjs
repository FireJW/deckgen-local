import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { renderHtmlDeck } from '../src/renderers/html-guizang/render.mjs';
import {
  isSwissRendererHint,
  resolveSwissTheme
} from '../src/renderers/guizang-swiss/theme.mjs';
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

test('Swiss theme detection is opt-in only', () => {
  assert.equal(isSwissRendererHint('swiss-ikb'), true);
  assert.equal(isSwissRendererHint('swiss_lemon'), true);
  assert.equal(isSwissRendererHint('indigo_porcelain'), false);
  assert.equal(isSwissRendererHint(undefined), false);
});

test('Swiss theme resolver exposes fixed accent tokens and fallback', () => {
  assert.deepEqual(resolveSwissTheme('swiss-ikb'), {
    key: 'swiss-ikb',
    accent: '#002FA7',
    accentRgb: '0,47,167',
    accentOn: '#ffffff',
    paper: '#fafaf8',
    paperRgb: '250,250,248',
    ink: '#0a0a0a',
    inkRgb: '10,10,10',
    grey1: '#f0f0ee',
    grey2: '#d4d4d2',
    grey3: '#737373'
  });
  assert.equal(resolveSwissTheme('swiss-custom-purple').key, 'swiss-ikb');
  assert.equal(resolveSwissTheme('swiss-lemon').accent, '#FFD500');
  assert.equal(resolveSwissTheme('swiss-green').accent, '#C5E803');
  assert.equal(resolveSwissTheme('swiss-orange').accent, '#FF6B35');
});

test('renderHtmlDeck routes swiss hints to the Swiss renderer', () => {
  const html = renderHtmlDeck({
    title: 'Swiss Briefing',
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [
      { id: 's01', role: 'cover', headline: 'Swiss Briefing', body: 'Preview', evidence_refs: [], layout_intent: 'hero_dark' },
      { id: 's02', role: 'content', headline: 'Grounded Claim', body: 'The body stays restrained.', evidence_refs: [], layout_intent: 'evidence' }
    ]
  });

  assert.match(html, /data-renderer="html-guizang-swiss"/);
  assert.match(html, /data-swiss-theme="swiss-ikb"/);
  assert.match(html, /data-layout="SWISS-COVER-ASCII"|data-layout="S01"/);
  assert.match(html, /data-layout="S03"|data-layout="S19"/);
  assert.match(html, /--accent:#002FA7/);
  assert.doesNotMatch(html, /data-renderer="html-guizang"/);
});

test('renderHtmlDeck keeps non-Swiss hints on Style A', () => {
  const html = renderHtmlDeck({
    title: 'Style A Briefing',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      { id: 's01', role: 'cover', headline: 'Style A Briefing', body: 'Preview', evidence_refs: [], layout_intent: 'hero_dark' }
    ]
  });

  assert.match(html, /data-renderer="html-guizang"/);
  assert.doesNotMatch(html, /html-guizang-swiss/);
});

test('renderHtmlDeck gives Swiss text_split slides a real two-column layout', () => {
  const html = renderHtmlDeck({
    title: 'Swiss Learning Layout',
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [
      {
        id: 's01',
        role: 'content',
        headline: 'Concept vs Explanation',
        body: 'Concept frame for the learner.\n\nDetailed explanation with implementation context.',
        evidence_refs: [],
        layout_intent: 'text_split'
      }
    ]
  });

  assert.match(html, /data-layout="S03"/);
  assert.match(html, /class="deckgen-swiss-copy deckgen-swiss-split"/);
  assert.match(html, /\.deckgen-swiss-copy\.deckgen-swiss-split\{[^}]*grid-template-columns:minmax\(0,0\.82fr\) minmax\(0,1fr\)/);
  assert.match(html, /\.deckgen-swiss-copy\.deckgen-swiss-split h2\{[^}]*grid-column:1/);
  assert.match(html, /\.deckgen-swiss-copy\.deckgen-swiss-split \.deckgen-swiss-body\{[^}]*grid-column:2/);
});

test('renderHtmlDeck renders quote slides as blockquotes in Style A and Swiss', () => {
  const slide = {
    id: 's01',
    role: 'content',
    headline: 'Quote: Markets reprice before filings.',
    body: '> Markets reprice before filings.\n> Evidence stays local.',
    evidence_refs: [],
    layout_intent: 'quote'
  };
  const styleA = renderHtmlDeck({
    title: 'Quote Deck',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [slide]
  });
  const swiss = renderHtmlDeck({
    title: 'Quote Deck',
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [slide]
  });

  assert.match(styleA, /class="slide dark slide-content layout-quote"/);
  assert.match(styleA, /<blockquote>Markets reprice before filings\.<br>Evidence stays local\.<\/blockquote>/);
  assert.doesNotMatch(styleA, /&gt; Markets/);
  assert.match(swiss, /data-layout="S09"/);
  assert.match(swiss, /class="deckgen-swiss-copy deckgen-swiss-quote"/);
  assert.match(swiss, /<blockquote>Markets reprice before filings\.<br>Evidence stays local\.<\/blockquote>/);
});

test('renderHtmlDeck renders image slides as figures in Style A and Swiss', () => {
  const slide = {
    id: 's01',
    role: 'content',
    headline: 'Image: Revenue bridge',
    body: '![Revenue bridge](assets/revenue-bridge.png)',
    evidence_refs: [],
    layout_intent: 'image'
  };
  const styleA = renderHtmlDeck({
    title: 'Image Deck',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [slide]
  });
  const swiss = renderHtmlDeck({
    title: 'Image Deck',
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [slide]
  });

  assert.match(styleA, /class="slide light slide-content layout-image"/);
  assert.match(styleA, /<figure class="deckgen-figure">/);
  assert.match(styleA, /<img src="assets\/revenue-bridge\.png" alt="Revenue bridge"/);
  assert.match(styleA, /<figcaption>Revenue bridge<\/figcaption>/);
  assert.doesNotMatch(styleA, /!\[Revenue bridge\]/);
  assert.match(swiss, /data-layout="S13"/);
  assert.match(swiss, /class="deckgen-swiss-copy deckgen-swiss-image"/);
  assert.match(swiss, /<figure class="deckgen-swiss-figure">/);
  assert.match(swiss, /<img src="assets\/revenue-bridge\.png" alt="Revenue bridge"/);
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

test('renderHtmlDeck renders structured slide items when body is absent', () => {
  const slide = {
    id: 's01',
    role: 'content',
    headline: 'Structured Table',
    items: [{
      kind: 'table',
      markdown: [
        '| Rank | Symbol |',
        '|---:|---|',
        '| 1 | `000988.SZ` |'
      ].join('\n'),
      evidence_refs: ['primary']
    }],
    evidence_refs: [],
    layout_intent: 'evidence'
  };
  const styleA = renderHtmlDeck({
    title: 'Structured Deck',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [slide]
  });
  const swiss = renderHtmlDeck({
    title: 'Structured Deck',
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [slide]
  });

  assert.match(styleA, /<table>/);
  assert.match(styleA, /<th>Rank<\/th>/);
  assert.match(styleA, /source: primary/);
  assert.match(swiss, /data-layout="S20"/);
  assert.match(swiss, /<table>/);
  assert.match(swiss, /source: primary/);
});

test('renderHtmlDeck renders structured bullet items as lists when body is absent', () => {
  const slide = {
    id: 's01',
    role: 'content',
    headline: 'Structured Bullets',
    items: [{
      kind: 'bullets',
      points: ['Demand strengthened', 'Margins expanded'],
      evidence_refs: []
    }],
    evidence_refs: [],
    layout_intent: 'evidence'
  };
  const styleA = renderHtmlDeck({
    title: 'Structured Deck',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [slide]
  });
  const swiss = renderHtmlDeck({
    title: 'Structured Deck',
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [slide]
  });

  assert.match(styleA, /<ul class="deckgen-list">/);
  assert.match(styleA, /<li>Demand strengthened<\/li>/);
  assert.match(styleA, /<li>Margins expanded<\/li>/);
  assert.match(swiss, /<ul class="deckgen-swiss-list">/);
  assert.match(swiss, /<li>Demand strengthened<\/li>/);
});

test('renderHtmlDeck deduplicates slide and item evidence references', () => {
  const html = renderHtmlDeck({
    title: 'Evidence Dedup',
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [
      {
        id: 's01',
        role: 'content',
        headline: 'Evidence-backed Claim',
        body: 'The claim stays grounded.',
        items: [{
          kind: 'paragraph',
          text: 'The claim stays grounded.',
          evidence_refs: [{ id: 'ev1', source_ref: 'primary', locator: 'p. 2', quote: 'Verified claim.' }]
        }],
        evidence_refs: [{ id: 'ev1', source_ref: 'primary', locator: 'p. 2', quote: 'Verified claim.' }],
        layout_intent: 'evidence'
      }
    ]
  });

  const matches = html.match(/ev1 \| source: primary \| p\. 2 \| Verified claim\./g) ?? [];
  assert.equal(matches.length, 1);
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
