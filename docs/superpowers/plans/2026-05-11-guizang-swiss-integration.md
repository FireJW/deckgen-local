# Guizang Swiss Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in Guizang Swiss style for both HTML preview and real PPTX export without changing existing Style A defaults.

**Architecture:** Keep `deck_contract.json` as the only renderer contract. Add shared Swiss theme detection/tokens, route HTML to either Style A or Swiss template output, and route PPTX SVG generation to either current visuals or Swiss visuals based on the same `swiss-*` renderer hint.

**Tech Stack:** Node ESM, `node:test`, local vendored upstream files under `third_party/`, Playwright HTML smoke, local `ppt-master`, PowerPoint COM visual smoke on Windows.

---

## File Structure

- Create `src/renderers/guizang-swiss/theme.mjs`
  - Owns Swiss hint detection, fallback behavior, accent tokens, and stable theme keys.
- Create `src/renderers/html-guizang/swiss.mjs`
  - Owns Swiss HTML slide generation and template injection.
- Modify `src/renderers/html-guizang/render.mjs`
  - Keeps existing Style A code path and delegates to Swiss when `isSwissRendererHint()` is true.
- Modify `src/renderers/ppt-master/render.mjs`
  - Adds Swiss SVG token selection and Swiss layout rendering while keeping existing PPTX path as default.
- Modify `src/integrations/guizang-ppt-skill.mjs`
  - Extends preflight to identify Swiss-capable upstream sources.
- Create `scripts/guizang-swiss-validate.mjs`
  - Wraps vendored `validate-swiss-deck.mjs` for local Swiss HTML smoke.
- Modify `scripts/html-visual-smoke.mjs` and `src/qc/html-visual-smoke.mjs`
  - Accepts `html-guizang-swiss` markers only when the rendered deck is Swiss.
- Add or modify tests:
  - `tests/html-renderer.test.mjs`
  - `tests/ppt-master-wrapper.test.mjs`
  - `tests/guizang-source-preflight.test.mjs`
  - `tests/html-visual-smoke.test.mjs`
  - `tests/generic-markdown.test.mjs`
  - `tests/e2e-generate.test.mjs`
- Add fixture:
  - `fixtures/generic-markdown/swiss-briefing.md`
- Vendor upstream files:
  - `third_party/guizang-ppt-skill/assets/template-swiss.html`
  - `third_party/guizang-ppt-skill/scripts/validate-swiss-deck.mjs`
  - `third_party/guizang-ppt-skill/references/layouts-swiss.md`
  - `third_party/guizang-ppt-skill/references/themes-swiss.md`
  - `third_party/guizang-ppt-skill/references/swiss-layout-lock.md`
- Modify docs:
  - `third_party/NOTICE.md`
  - `README.md`
  - `docs/design/cross-repo-deckgen.md`

---

### Task 1: Vendor Swiss Upstream Assets And Notice

**Files:**
- Create: `third_party/guizang-ppt-skill/assets/template-swiss.html`
- Create: `third_party/guizang-ppt-skill/scripts/validate-swiss-deck.mjs`
- Create: `third_party/guizang-ppt-skill/references/layouts-swiss.md`
- Create: `third_party/guizang-ppt-skill/references/themes-swiss.md`
- Create: `third_party/guizang-ppt-skill/references/swiss-layout-lock.md`
- Modify: `third_party/NOTICE.md`
- Test: `tests/guizang-source-preflight.test.mjs`

- [ ] **Step 1: Write the failing preflight test**

Add a test to `tests/guizang-source-preflight.test.mjs`:

```js
test('inspectGuizangSourcePath reports swiss template and validator support', () => {
  const sourceDir = makeGuizangFixture();
  mkdirSync(path.join(sourceDir, 'scripts'), { recursive: true });
  writeFileSync(path.join(sourceDir, 'assets', 'template-swiss.html'), '<div id="deck"><!-- SLIDES_HERE --></div>', 'utf8');
  writeFileSync(path.join(sourceDir, 'scripts', 'validate-swiss-deck.mjs'), 'process.exit(0);\n', 'utf8');

  const result = inspectGuizangSourcePath(sourceDir);

  assert.equal(result.ok, true);
  assert.equal(result.hasSwissTemplate, true);
  assert.equal(result.hasSwissValidator, true);
});
```

Add a zip coverage test to the same file so archive sources report the same
capability flags:

```js
test('inspectGuizangSourcePath reports swiss support in zip archives', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-guizang-swiss-zip-source-'));
  const archivePath = path.join(tempDir, 'guizang-ppt-skill-main.zip');
  writeStoredZip(archivePath, [
    ['guizang-ppt-skill-main/LICENSE', 'MIT License\nCopyright (c) 2026 op7418\n'],
    ['guizang-ppt-skill-main/assets/template.html', '<!doctype html><title>Guizang</title>'],
    ['guizang-ppt-skill-main/assets/template-swiss.html', '<!doctype html><title>Swiss</title>'],
    ['guizang-ppt-skill-main/assets/motion.min.js', 'window.Motion = {};'],
    ['guizang-ppt-skill-main/scripts/validate-swiss-deck.mjs', 'process.exit(0);\n']
  ]);

  const result = inspectGuizangSourcePath(archivePath);

  assert.equal(result.ok, true);
  assert.equal(result.hasSwissTemplate, true);
  assert.equal(result.hasSwissValidator, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests\guizang-source-preflight.test.mjs
```

Expected: FAIL because `inspectGuizangSourcePath()` does not expose `hasSwissTemplate` and `hasSwissValidator`.

- [ ] **Step 3: Vendor upstream files**

Do not use `D:\下载\guizang-ppt-skill-main.zip` for this task; it was checked
locally and contains only the pre-Swiss files. Fetch exactly these upstream
files from `op7418/guizang-ppt-skill` commit
`f6676c3f315e4cbf8abb41daa26377688a716a5f`:

```text
assets/template-swiss.html
scripts/validate-swiss-deck.mjs
references/layouts-swiss.md
references/themes-swiss.md
references/swiss-layout-lock.md
```

Do not overwrite `assets/template.html`, `assets/motion.min.js`, or `LICENSE` in this task.

Use these exact commands from the repository root:

```powershell
New-Item -ItemType Directory -Force third_party\guizang-ppt-skill\assets | Out-Null
New-Item -ItemType Directory -Force third_party\guizang-ppt-skill\scripts | Out-Null
New-Item -ItemType Directory -Force third_party\guizang-ppt-skill\references | Out-Null
curl.exe -L "https://raw.githubusercontent.com/op7418/guizang-ppt-skill/f6676c3f315e4cbf8abb41daa26377688a716a5f/assets/template-swiss.html" -o third_party\guizang-ppt-skill\assets\template-swiss.html
curl.exe -L "https://raw.githubusercontent.com/op7418/guizang-ppt-skill/f6676c3f315e4cbf8abb41daa26377688a716a5f/scripts/validate-swiss-deck.mjs" -o third_party\guizang-ppt-skill\scripts\validate-swiss-deck.mjs
curl.exe -L "https://raw.githubusercontent.com/op7418/guizang-ppt-skill/f6676c3f315e4cbf8abb41daa26377688a716a5f/references/layouts-swiss.md" -o third_party\guizang-ppt-skill\references\layouts-swiss.md
curl.exe -L "https://raw.githubusercontent.com/op7418/guizang-ppt-skill/f6676c3f315e4cbf8abb41daa26377688a716a5f/references/themes-swiss.md" -o third_party\guizang-ppt-skill\references\themes-swiss.md
curl.exe -L "https://raw.githubusercontent.com/op7418/guizang-ppt-skill/f6676c3f315e4cbf8abb41daa26377688a716a5f/references/swiss-layout-lock.md" -o third_party\guizang-ppt-skill\references\swiss-layout-lock.md
```

- [ ] **Step 4: Update preflight implementation**

In `src/integrations/guizang-ppt-skill.mjs`, implement the capability checks
with the module's existing `findExistingFile()` and `findZipEntry()` helpers:

```js
const swissTemplateCandidates = [path.join('assets', 'template-swiss.html')];
const swissValidatorCandidates = [path.join('scripts', 'validate-swiss-deck.mjs')];
```

For directories, add these properties to the success result:

```js
hasSwissTemplate: Boolean(findExistingFile(resolvedPath, swissTemplateCandidates)),
hasSwissValidator: Boolean(findExistingFile(resolvedPath, swissValidatorCandidates))
```

For zip archives, use `findZipEntry(entries, swissTemplateCandidates, archiveRoot)`
and `findZipEntry(entries, swissValidatorCandidates, archiveRoot)` to set the
same boolean properties. Do not make Swiss required for Style A preflight
success yet.

- [ ] **Step 5: Update notice**

In `third_party/NOTICE.md`, add the upstream commit and new files:

```md
  - Upstream commit used for Swiss Style B assets: f6676c3f315e4cbf8abb41daa26377688a716a5f
  - Additional vendored Swiss files:
    - `third_party/guizang-ppt-skill/assets/template-swiss.html`
    - `third_party/guizang-ppt-skill/scripts/validate-swiss-deck.mjs`
    - `third_party/guizang-ppt-skill/references/layouts-swiss.md`
    - `third_party/guizang-ppt-skill/references/themes-swiss.md`
    - `third_party/guizang-ppt-skill/references/swiss-layout-lock.md`
```

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test tests\guizang-source-preflight.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 7: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add third_party/guizang-ppt-skill third_party/NOTICE.md src/integrations/guizang-ppt-skill.mjs tests/guizang-source-preflight.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "chore: vendor guizang swiss assets"
```

---

### Task 2: Add Swiss Theme Detection And Tokens

**Files:**
- Create: `src/renderers/guizang-swiss/theme.mjs`
- Test: `tests/html-renderer.test.mjs`

- [ ] **Step 1: Write the failing theme tests**

Add tests to `tests/html-renderer.test.mjs`:

```js
import {
  isSwissRendererHint,
  resolveSwissTheme
} from '../src/renderers/guizang-swiss/theme.mjs';

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests\html-renderer.test.mjs
```

Expected: FAIL because `src/renderers/guizang-swiss/theme.mjs` does not exist.

- [ ] **Step 3: Implement the theme module**

Create `src/renderers/guizang-swiss/theme.mjs`:

```js
const normalizeHint = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/_/g, '-');

const BASE = {
  paper: '#fafaf8',
  paperRgb: '250,250,248',
  ink: '#0a0a0a',
  inkRgb: '10,10,10',
  grey1: '#f0f0ee',
  grey2: '#d4d4d2',
  grey3: '#737373'
};

const SWISS_THEMES = {
  'swiss-ikb': { accent: '#002FA7', accentRgb: '0,47,167', accentOn: '#ffffff' },
  'swiss-lemon': { accent: '#FFD500', accentRgb: '255,213,0', accentOn: '#0a0a0a' },
  'swiss-green': { accent: '#C5E803', accentRgb: '197,232,3', accentOn: '#0a0a0a' },
  'swiss-orange': { accent: '#FF6B35', accentRgb: '255,107,53', accentOn: '#ffffff' }
};

export function isSwissRendererHint(value) {
  return normalizeHint(value).startsWith('swiss-');
}

export function resolveSwissTheme(value) {
  const key = SWISS_THEMES[normalizeHint(value)] ? normalizeHint(value) : 'swiss-ikb';
  return {
    key,
    ...BASE,
    ...SWISS_THEMES[key]
  };
}
```

- [ ] **Step 4: Run tests**

Run:

```powershell
node --test tests\html-renderer.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 5: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add src/renderers/guizang-swiss/theme.mjs tests/html-renderer.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: add swiss theme tokens"
```

---

### Task 3: Route Swiss HTML Rendering Without Breaking Style A

**Files:**
- Create: `src/renderers/html-guizang/swiss.mjs`
- Modify: `src/renderers/html-guizang/render.mjs`
- Test: `tests/html-renderer.test.mjs`

- [ ] **Step 1: Write failing Swiss HTML routing tests**

Add tests to `tests/html-renderer.test.mjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\html-renderer.test.mjs
```

Expected: FAIL because `renderHtmlDeck()` still always uses Style A.

- [ ] **Step 3: Create minimal Swiss HTML renderer**

Create `src/renderers/html-guizang/swiss.mjs` with these exported functions:

```js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';
import { resolveSwissTheme } from '../guizang-swiss/theme.mjs';

const rendererDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(rendererDir, '..', '..', '..', 'third_party', 'guizang-ppt-skill');
const templatePath = path.join(root, 'assets', 'template-swiss.html');
const slidesPlaceholderPattern = /<!-- SLIDES_HERE[\s\S]*?-->/;

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const stableClassPart = (value, fallback) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || fallback;

const renderThemeVars = (theme) => [
  `--paper:${theme.paper};`,
  `--paper-rgb:${theme.paperRgb};`,
  `--ink:${theme.ink};`,
  `--ink-rgb:${theme.inkRgb};`,
  `--grey-1:${theme.grey1};`,
  `--grey-2:${theme.grey2};`,
  `--grey-3:${theme.grey3};`,
  `--accent:${theme.accent};`,
  `--accent-rgb:${theme.accentRgb};`,
  `--accent-on:${theme.accentOn};`
].join('');

const swissLayoutForSlide = (slide) => {
  const role = stableClassPart(slide?.role, 'content');
  const layout = stableClassPart(slide?.layout_intent, 'default');
  if (role === 'cover' || layout === 'hero-dark') return 'SWISS-COVER-ASCII';
  if (layout === 'text-split') return 'S03';
  if (String(slide?.body ?? '').includes('|')) return 'S20';
  return 'S19';
};

const renderEvidence = (slide) => {
  const refs = formatEvidenceRefs(slide?.evidence_refs);
  if (refs.length === 0) return '';
  return `<div class="swiss-footnote">${refs.map((ref) => `<div>${escapeHtml(ref)}</div>`).join('')}</div>`;
};

const renderSlide = (slide, index, total, title) => {
  const layout = swissLayoutForSlide(slide);
  const label = String(index + 1).padStart(2, '0');
  const surface = layout === 'SWISS-COVER-ASCII' ? 'accent' : 'light';
  return [
    `<section class="slide ${surface}" data-layout="${layout}" data-animate="cascade" data-slide-index="${index}">`,
    '  <div class="canvas-card">',
    '    <div class="chrome-min">',
    `      <div class="l">${escapeHtml(title)}</div>`,
    `      <div class="r">${label} / ${String(total).padStart(2, '0')}</div>`,
    '    </div>',
    '    <div class="deckgen-swiss-copy" data-anim>',
    `      <div class="t-meta">${escapeHtml(slide?.role ?? 'content')}</div>`,
    `      <h2>${escapeHtml(slide?.headline ?? '')}</h2>`,
    `      <p>${escapeHtml(slide?.body ?? '').replaceAll('\n', '<br>')}</p>`,
    renderEvidence(slide),
    '    </div>',
    '  </div>',
    '</section>'
  ].filter(Boolean).join('\n');
};

export function renderSwissHtmlDeck(contract) {
  const title = contract?.title ?? 'Deck';
  const theme = resolveSwissTheme(contract?.theme?.renderer_hint);
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];
  const slideHtml = slides.map((slide, index) => renderSlide(slide, index, slides.length, title)).join('\n');
  const template = readFileSync(templatePath, 'utf8');

  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace('</style>', `:root{${renderThemeVars(theme)}}\n#deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy{display:grid;gap:2.4vh;max-width:72ch}#deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy h2{font-weight:200;line-height:.96;letter-spacing:-.035em}#deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy p{font-weight:300;line-height:1.5}.swiss-footnote{margin-top:auto;font-size:12px;color:var(--grey-3);display:grid;gap:4px}\n</style>`)
    .replace('<div id="deck">', `<div id="deck" data-renderer="html-guizang-swiss" data-swiss-theme="${theme.key}">`)
    .replace(slidesPlaceholderPattern, slideHtml);
}
```

- [ ] **Step 4: Route from existing renderer**

In `src/renderers/html-guizang/render.mjs`, import:

```js
import { isSwissRendererHint } from '../guizang-swiss/theme.mjs';
import { renderSwissHtmlDeck } from './swiss.mjs';
```

At the top of `renderHtmlDeck(contract)`, before Style A rendering:

```js
if (isSwissRendererHint(contract?.theme?.renderer_hint)) {
  return renderSwissHtmlDeck(contract);
}
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test tests\html-renderer.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 6: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add src/renderers/html-guizang/render.mjs src/renderers/html-guizang/swiss.mjs tests/html-renderer.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: render swiss guizang html"
```

---

### Task 4: Add Swiss HTML Validator Smoke

**Files:**
- Create: `scripts/guizang-swiss-validate.mjs`
- Modify: `package.json`
- Test: `tests/html-renderer.test.mjs` or create `tests/guizang-swiss-validate.test.mjs`

- [ ] **Step 1: Write failing validator script test**

Create `tests/guizang-swiss-validate.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'guizang-swiss-validate.mjs');

test('guizang Swiss validator wrapper accepts registered Swiss layouts', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-swiss-validate-'));
  const htmlPath = path.join(dir, 'index.html');
  writeFileSync(htmlPath, [
    '<!doctype html><html><body>',
    '<section class="slide accent" data-layout="SWISS-COVER-ASCII"><div class="canvas-card"><h2>Cover</h2></div></section>',
    '<section class="slide light" data-layout="S19"><div class="canvas-card"><h2>Claim</h2></div></section>',
    '</body></html>'
  ].join('\n'));

  const run = spawnSync(process.execPath, [script, htmlPath], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /PASS/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\guizang-swiss-validate.test.mjs
```

Expected: FAIL because `scripts/guizang-swiss-validate.mjs` does not exist.

- [ ] **Step 3: Implement wrapper**

Create `scripts/guizang-swiss-validate.mjs`:

```js
#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(root, 'third_party', 'guizang-ppt-skill', 'scripts', 'validate-swiss-deck.mjs');
const htmlPath = process.argv[2] ? path.resolve(process.argv[2]) : '';

if (!htmlPath) {
  process.stderr.write('Usage: guizang-swiss-validate <html-path>\n');
  process.exit(2);
}

if (!existsSync(htmlPath)) {
  process.stderr.write(`HTML file not found: ${htmlPath}\n`);
  process.exit(1);
}

if (!existsSync(validator)) {
  process.stderr.write(`Swiss validator not found: ${validator}\n`);
  process.exit(1);
}

const run = spawnSync(process.execPath, [validator, htmlPath], { encoding: 'utf8' });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

process.stdout.write(`PASS Swiss validator: ${htmlPath}\n`);
```

- [ ] **Step 4: Add npm script**

In `package.json`, add:

```json
"smoke:swiss": "node scripts/guizang-swiss-validate.mjs"
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test tests\guizang-swiss-validate.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 6: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add scripts/guizang-swiss-validate.mjs package.json tests/guizang-swiss-validate.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: validate swiss html output"
```

---

### Task 5: Update HTML Visual Smoke For Swiss Renderer

**Files:**
- Modify: `src/qc/html-visual-smoke.mjs`
- Modify: `scripts/html-visual-smoke.mjs`
- Test: `tests/html-visual-smoke.test.mjs`

- [ ] **Step 1: Write failing smoke validation test**

Add to `tests/html-visual-smoke.test.mjs`:

```js
test('validateVisualSmokeResult accepts Swiss renderer markers', () => {
  const result = validateVisualSmokeResult({
    title: 'Swiss Briefing',
    expectedTitle: 'Swiss Briefing',
    renderer: 'html-guizang-swiss',
    hasDeck: true,
    hasNav: true,
    hasGuizangShell: true,
    hasSwissLayouts: true,
    hasLocalMotionAsset: true,
    externalScripts: [],
    slideCount: 3,
    expectedSlides: 3,
    bodyTextLength: 120,
    overflowItems: [],
    screenshotPath: '.tmp/deckgen-visual-smoke/swiss.png',
    screenshotBytes: 100
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\html-visual-smoke.test.mjs
```

Expected: FAIL because Swiss marker fields are not accepted yet.

- [ ] **Step 3: Update validation**

In `src/qc/html-visual-smoke.mjs`, update `validateVisualSmokeResult()`:

```js
const isSwiss = summary.renderer === 'html-guizang-swiss';
if (!['html-guizang', 'html-guizang-swiss'].includes(summary.renderer)) {
  errors.push(`unexpected renderer marker: ${summary.renderer || 'missing'}`);
}
if (isSwiss && summary.hasSwissLayouts !== true) {
  errors.push('Swiss renderer is missing registered data-layout markers');
}
if (!isSwiss && summary.hasGuizangShell !== true) {
  errors.push('missing guizang shell markers');
}
```

Keep existing Style A checks for non-Swiss output.

- [ ] **Step 4: Update browser collection**

In `scripts/html-visual-smoke.mjs`, include this in the browser-evaluated summary:

```js
hasSwissLayouts: Array.from(document.querySelectorAll('.slide')).every((slide) => slide.hasAttribute('data-layout'))
```

Keep existing `renderer` collection from `#deck.dataset.renderer`.

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test tests\html-visual-smoke.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 6: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add src/qc/html-visual-smoke.mjs scripts/html-visual-smoke.mjs tests/html-visual-smoke.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: smoke swiss html renderer"
```

---

### Task 6: Add Swiss PPTX SVG Mode

**Files:**
- Modify: `src/renderers/ppt-master/render.mjs`
- Test: `tests/ppt-master-wrapper.test.mjs`

- [ ] **Step 1: Write failing PPTX Swiss SVG test**

Add to `tests/ppt-master-wrapper.test.mjs`:

```js
test('renderPptMasterDeck renders swiss hinted decks with Swiss SVG tokens', () => {
  const pptMasterPath = makeFakePptMaster(`
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', '..', '..', 'fixture.pptx'), path.join(exportsDir, 'fake.pptx'));
`);
  const outputDir = path.join(os.tmpdir(), `deckgen-swiss-ppt-project-${Date.now()}`);
  const swissContract = {
    ...sampleContract,
    theme: { renderer_hint: 'swiss-ikb' },
    slides: [
      sampleContract.slides[0],
      {
        ...sampleContract.slides[1],
        headline: 'Swiss Claim',
        body: 'The visual system should use Swiss tokens.',
        evidence_refs: [{ id: 'ev1', source_ref: 'primary', quote: 'Verified.' }]
      }
    ],
    source_refs: [{ id: 'primary', type: 'local_file', path: 'D:/source.md', role: 'primary' }]
  };

  renderPptMasterDeck({
    contract: swissContract,
    content: '# Swiss Claim',
    config: { pptMasterPath, pythonPath: process.execPath },
    outputDir
  });

  const svg = readFileSync(path.join(outputDir, 'svg_final', '02_s02.svg'), 'utf8');
  assert.match(svg, /data-renderer="ppt-master-swiss"/);
  assert.match(svg, /#fafaf8/);
  assert.match(svg, /#002FA7/);
  assert.match(svg, /Swiss Claim/);
  assert.match(svg, /Verified\./);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\ppt-master-wrapper.test.mjs
```

Expected: FAIL because PPTX SVG does not yet mark Swiss renderer or use Swiss tokens.

- [ ] **Step 3: Implement Swiss token selection**

In `src/renderers/ppt-master/render.mjs`, import:

```js
import { isSwissRendererHint, resolveSwissTheme } from '../guizang-swiss/theme.mjs';
```

Add helper:

```js
const resolvePptVisualTheme = (contract) => {
  if (isSwissRendererHint(contract?.theme?.renderer_hint)) {
    const swiss = resolveSwissTheme(contract.theme.renderer_hint);
    return {
      renderer: 'ppt-master-swiss',
      background: swiss.paper,
      bodyColor: swiss.ink,
      accent: swiss.accent,
      muted: swiss.grey3,
      line: swiss.grey2,
      swiss
    };
  }

  return {
    renderer: 'ppt-master',
    background: '#f6f2e9',
    bodyColor: '#161616',
    accent: '#264f78',
    muted: '#5e6470',
    line: '#d7d0c4',
    swiss: null
  };
};
```

Use this theme object inside SVG creation instead of hard-coded colors. Add
`data-renderer="${theme.renderer}"` to the root `<svg>`.

- [ ] **Step 4: Implement minimal Swiss layout differences**

When `theme.swiss` is present:

- use a white paper background
- place headline near the top-left
- use `theme.accent` for one hairline or accent block
- render evidence references near the bottom with muted grey
- preserve existing table truncation and text-split behavior

Do not rewrite the full PPTX renderer in this task.

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test tests\ppt-master-wrapper.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 6: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add src/renderers/ppt-master/render.mjs tests/ppt-master-wrapper.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: render swiss pptx svg"
```

---

### Task 7: Add Swiss Fixture And End-To-End Smoke

**Files:**
- Create: `fixtures/generic-markdown/swiss-briefing.md`
- Modify: `src/adapters/generic-markdown.mjs`
- Modify: `tests/generic-markdown.test.mjs`
- Modify: `tests/e2e-generate.test.mjs`
- Modify: `README.md`
- Modify: `docs/design/cross-repo-deckgen.md`

- [ ] **Step 1: Write failing frontmatter handoff test**

Add to `tests/generic-markdown.test.mjs`:

```js
test('buildGenericMarkdownPackage carries supported YAML frontmatter into the contract', () => {
  const sourcePath = path.join(root, 'fixtures', 'generic-markdown', 'swiss-briefing.md');
  const md = [
    '---',
    'title: Swiss Briefing',
    'theme:',
    '  renderer_hint: swiss-ikb',
    '---',
    '',
    '# Swiss Briefing',
    '',
    '## Strategic Claim',
    '',
    'The deck should preview and export with the same Swiss visual system.'
  ].join('\n');

  const result = buildGenericMarkdownPackage({ sourcePath, markdown: md, profile: 'briefing' });

  assert.equal(result.contract.title, 'Swiss Briefing');
  assert.equal(result.contract.theme.renderer_hint, 'swiss-ikb');
  assert.equal(result.content.startsWith('# Swiss Briefing'), true);
  assert.doesNotMatch(result.content, /^---/);
  assert.equal(validateDeckContract(result.contract).ok, true);
});
```

- [ ] **Step 2: Run frontmatter test to verify it fails**

Run:

```powershell
node --test tests\generic-markdown.test.mjs
```

Expected: FAIL because `buildGenericMarkdownPackage()` currently ignores YAML
frontmatter and overwrites `theme.renderer_hint` from the profile.

- [ ] **Step 3: Implement minimal frontmatter parsing**

In `src/adapters/generic-markdown.mjs`, add these helpers near the top of the
file:

```js
const normalizeMarkdown = (markdown) => markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const parseFrontmatterScalar = (line) => {
  const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
  if (!match) return null;
  return [match[1], match[2].replace(/^['"]|['"]$/g, '')];
};

const parseSupportedFrontmatter = (raw) => {
  const metadata = {};
  const lines = raw.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalar = parseFrontmatterScalar(line);
    if (scalar?.[0] === 'title' && scalar[1]) {
      metadata.title = scalar[1];
      continue;
    }

    if (line.trim() === 'theme:') {
      const next = lines[index + 1] ?? '';
      const renderer = next.match(/^\s{2}renderer_hint:\s*(.*?)\s*$/);
      if (renderer?.[1]) {
        metadata.theme = { renderer_hint: renderer[1].replace(/^['"]|['"]$/g, '') };
      }
    }
  }
  return metadata;
};

const extractLeadingFrontmatter = (markdown) => {
  const normalized = normalizeMarkdown(markdown);
  if (!normalized.startsWith('---\n')) {
    return { metadata: {}, markdown };
  }

  const endMarker = normalized.indexOf('\n---', 4);
  if (endMarker < 0) {
    return { metadata: {}, markdown };
  }

  const afterMarker = normalized.slice(endMarker + 4);
  return {
    metadata: parseSupportedFrontmatter(normalized.slice(4, endMarker).trim()),
    markdown: afterMarker.replace(/^\n/, '')
  };
};
```

Then update `buildGenericMarkdownPackage()` to use the parsed body and renderer
hint:

```js
  const parsed = extractLeadingFrontmatter(markdown);
  const bodyMarkdown = parsed.markdown;
  const title = parsed.metadata.title
    ?? firstMarkdownHeading(bodyMarkdown)
    ?? fallbackTitleFromPath(sourcePath);
  const rendererHint = parsed.metadata.theme?.renderer_hint
    ?? (profile === 'learning' ? 'ink_classic' : 'indigo_porcelain');
  const contract = buildDeckPlan({
    title,
    audience: 'internal briefing',
    profile,
    sourceText: bodyMarkdown
  });
```

Return the stripped markdown and parsed renderer hint:

```js
    content: bodyMarkdown,
    contract: {
      ...contract,
      source_refs: [{ type: 'local_file', path: sourcePath, role: 'primary', id: 'primary' }],
      hard_constraints: ['Keep the source text grounded', 'Do not invent facts'],
      theme: {
        ...contract.theme,
        renderer_hint: rendererHint
      },
      slides: attachPrimarySourceEvidence(contract.slides),
      outputs: ['html']
    }
```

- [ ] **Step 4: Run frontmatter tests**

Run:

```powershell
node --test tests\generic-markdown.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 5: Create fixture**

Create `fixtures/generic-markdown/swiss-briefing.md`:

```md
---
title: Swiss Briefing
theme:
  renderer_hint: swiss-ikb
---

# Swiss Briefing

## Strategic Claim

The deck should preview and export with the same Swiss visual system.

## Signal Table

| Rank | Signal | Score |
|---:|---|---:|
| 1 | product_velocity | 82 |
| 2 | evidence_quality | 77 |

## Split View

Left-side thesis.

Right-side explanation with a grounded citation.
```

- [ ] **Step 6: Write failing e2e test**

Add to `tests/e2e-generate.test.mjs`:

```js
const swissSource = path.join(root, 'fixtures', 'generic-markdown', 'swiss-briefing.md');
```

Then add the test:

```js
test('generate writes sibling Swiss html and pptx outputs for both mode', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-swiss-both-'));
  const pptMasterPath = makeFakePptMaster();
  const pythonPath = makeFakePython();
  const run = runGenerate(
    ['--source', swissSource, '--profile', 'briefing', '--output', 'both', '--workdir', tmp, '--ppt-master-path', pptMasterPath],
    { env: { DECKGEN_PPT_MASTER_PYTHON: pythonPath } }
  );

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const html = readFileSync(path.join(runDir, 'html', 'index.html'), 'utf8');
  assert.match(html, /data-renderer="html-guizang-swiss"/);
  assert.match(html, /data-swiss-theme="swiss-ikb"/);
  const svg = readFileSync(path.join(runDir, 'ppt-master', 'svg_final', '02_s02.svg'), 'utf8');
  assert.match(svg, /data-renderer="ppt-master-swiss"/);
});
```

- [ ] **Step 7: Run e2e test to verify it fails**

Run:

```powershell
node --test tests\e2e-generate.test.mjs
```

Expected: FAIL until the Swiss HTML and PPTX renderers from Tasks 3 and 6 are
both active for the fixture.

- [ ] **Step 8: Update docs**

In `README.md`, add a concise Swiss opt-in example:

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\swiss-briefing.md --profile briefing --output both --ppt-master-path D:\Users\rickylu\dev\ppt-master
```

In `docs/design/cross-repo-deckgen.md`, add a short section describing Swiss as opt-in through `theme.renderer_hint: swiss-*`.

- [ ] **Step 9: Run tests**

Run:

```powershell
node --test tests\generic-markdown.test.mjs
node --test tests\e2e-generate.test.mjs
npm.cmd test
```

Expected: targeted test passes, full suite passes.

- [ ] **Step 10: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add fixtures/generic-markdown/swiss-briefing.md tests/generic-markdown.test.mjs tests/e2e-generate.test.mjs README.md docs/design/cross-repo-deckgen.md src/adapters/generic-markdown.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: add swiss deck fixture"
```

---

### Task 8: Run Real Swiss HTML, PPTX, And Both Smokes

**Files:**
- Modify only if smoke reveals a tested defect.

- [ ] **Step 1: Generate Swiss HTML**

Run:

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\swiss-briefing.md --profile briefing --output html
```

Expected: command prints `written <RUN_DIR>` and `<RUN_DIR>\html\index.html` exists.

- [ ] **Step 2: Run HTML visual smoke**

Run:

```powershell
npm.cmd run smoke:html -- --run-dir <RUN_DIR> --expected-title "Swiss Briefing" --module-dir C:\Users\rickylu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules --browser-executable "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Expected: JSON output has `"ok": true`.

- [ ] **Step 3: Run Swiss validator**

Run:

```powershell
npm.cmd run smoke:swiss -- <RUN_DIR>\html\index.html
```

Expected: exits 0 and prints `PASS Swiss validator`.

- [ ] **Step 4: Generate Swiss PPTX**

Run:

```powershell
npm.cmd run preflight:ppt-master -- --ppt-master-path D:\Users\rickylu\dev\ppt-master
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\swiss-briefing.md --profile briefing --output pptx --ppt-master-path D:\Users\rickylu\dev\ppt-master
```

Expected: command prints `written <PPTX_RUN_DIR>` and `<PPTX_RUN_DIR>\ppt-master\exports\*.pptx` exists.

- [ ] **Step 5: Run PPTX smokes**

Run:

```powershell
npm.cmd run smoke:pptx -- --run-dir <PPTX_RUN_DIR>
npm.cmd run smoke:pptx:visual -- --run-dir <PPTX_RUN_DIR> --all-slides
```

Expected: both commands output `"ok": true`. PowerPoint visual smoke may require escalated execution because it launches local Office through COM.

- [ ] **Step 6: Generate both outputs**

Run:

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\swiss-briefing.md --profile briefing --output both --ppt-master-path D:\Users\rickylu\dev\ppt-master
```

Expected: one run directory contains both `html/index.html` and `ppt-master/exports/*.pptx`.

- [ ] **Step 7: Commit any smoke-driven fixes**

If smoke finds a real bug, write a failing test for that bug first, implement the smallest fix, rerun the relevant smoke, then commit:

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local status --short --branch
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add <changed-files>
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "fix: stabilize swiss deck smoke"
```

If no fixes are needed, do not create an empty commit.

---

### Task 9: Final Verification And Push

**Files:**
- No expected edits.

- [ ] **Step 1: Run full test suite**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 2: Check git status**

Run:

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local status --short --branch
```

Expected: clean worktree, branch ahead of `origin/master`.

- [ ] **Step 3: Push**

Run:

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local push
```

Expected: pushes all local commits to `https://github.com/FireJW/deckgen-local.git`.

- [ ] **Step 4: Final report**

Report:

- completed tasks
- changed files
- commits
- commands run
- smoke run directories
- remaining risks

---

## Plan Self-Review

- Spec coverage: vendoring, theme trigger, HTML Swiss, PPTX Swiss, QA, docs,
  and push are all represented by tasks.
- Scope control: first implementation covers common deckgen layouts only and
  keeps Swiss opt-in; all 22 upstream layouts and image-slot-heavy decks stay
  out of scope.
- Placeholder scan: no `TODO`, `TBD`, or "write tests for the above" steps are
  left as instructions without concrete test names and commands.
- Type consistency: shared functions are named `isSwissRendererHint`,
  `resolveSwissTheme`, `renderSwissHtmlDeck`, and `resolvePptVisualTheme`
  consistently across tasks.
