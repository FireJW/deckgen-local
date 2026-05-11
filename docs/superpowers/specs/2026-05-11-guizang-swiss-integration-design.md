# Guizang Swiss Opt-In Integration Design

## Context

`deckgen-local` currently generates sibling HTML and PPTX outputs from the same
`deck_contract.json`. HTML uses the vendored `op7418/guizang-ppt-skill`
Style A shell, while PPTX is produced through a local `ppt-master` checkout.

Upstream `op7418/guizang-ppt-skill` added a Style B Swiss system on commit
`f6676c3f315e4cbf8abb41daa26377688a716a5f`. The new upstream pieces are:

- `assets/template-swiss.html`
- `references/layouts-swiss.md`
- `references/themes-swiss.md`
- `references/swiss-layout-lock.md`
- `scripts/validate-swiss-deck.mjs`

The Swiss system is not a simple color swap. It is a stricter layout system:
fixed registered layouts, left-top title axes, single accent color, restrained
grey scale, hard rectangular surfaces, image-slot rules, and a validator that
rejects unregistered or visually drifted pages.

## Goal

Add Swiss as an opt-in visual system for both HTML preview and real PPTX export,
while preserving current Style A behavior and fail-closed PPTX semantics.

The implementation must keep HTML and PPTX as sibling outputs from
`deck_contract.json`; it must not convert HTML into PPTX.

## Non-Goals

- Do not make Swiss the default renderer in the first integration.
- Do not replace or remove Style A assets.
- Do not copy generation logic into business repositories.
- Do not attempt to implement all 22 upstream Swiss layouts in the first pass.
- Do not accept arbitrary user-defined Swiss hex colors.
- Do not relax PPTX success checks; a real `.pptx` artifact is still required.

## Trigger Model

Swiss rendering is enabled only when `contract.theme.renderer_hint` starts with
`swiss-`.

Supported first-pass hints:

- `swiss-ikb`
- `swiss-lemon`
- `swiss-green`
- `swiss-orange`

Non-Swiss hints continue to use the existing HTML Style A renderer and current
PPTX visuals. Unknown `swiss-*` hints resolve to `swiss-ikb` with a documented
fallback rather than accepting arbitrary colors.

No CLI option is required for the first pass. A later CLI convenience option
such as `--theme swiss-ikb` can be added after the renderer path is stable.

## Vendoring

Vendor only the upstream assets needed for local, auditable rendering:

- `third_party/guizang-ppt-skill/assets/template-swiss.html`
- `third_party/guizang-ppt-skill/scripts/validate-swiss-deck.mjs`
- `third_party/guizang-ppt-skill/references/layouts-swiss.md`
- `third_party/guizang-ppt-skill/references/themes-swiss.md`
- `third_party/guizang-ppt-skill/references/swiss-layout-lock.md`

Update `third_party/NOTICE.md` with the upstream commit SHA, MIT license, and
new vendored file list.

The existing guizang source preflight should accept Swiss-capable upstream
sources only when `template-swiss.html`, license, and the validator are present.

## HTML Design

The HTML renderer keeps one public entrypoint, `renderHtmlDeck(contract)`, and
routes internally:

- Style A path: existing behavior, `data-renderer="html-guizang"`.
- Swiss path: new behavior, `data-renderer="html-guizang-swiss"`.

Swiss HTML loads `template-swiss.html`, removes or rewrites external-only
scripts if any are present, injects deckgen slides at the existing
`SLIDES_HERE` marker, and emits local-only assets.

Every Swiss slide section must include a registered `data-layout` value so the
upstream validator can check the generated HTML. First-pass mapping:

| Contract layout | Swiss layout target |
| --- | --- |
| cover / `hero_dark` | `SWISS-COVER-ASCII` or `S01`-like cover |
| content / evidence | `S03` statement or `S19` card group |
| `text_split` | `S03` split statement |
| Markdown table | `S20` ledger or `S21` tech spec sheet |
| evidence references | footnote/citation zone inside the selected layout |

The renderer should generate Swiss-shaped HTML directly rather than trying to
reuse Style A slide markup with different CSS. That keeps the validator useful
and prevents layout drift.

## PPTX Design

The `ppt-master` renderer reads the same `deck_contract.json` and switches to a
Swiss SVG visual system when the same `swiss-*` hint is present.

Swiss PPTX should share these visual tokens with the HTML path:

- paper: near-white, not pure white
- ink: near-black
- grey scale: restrained neutral greys
- accent: one selected Swiss accent only
- geometry: straight edges, hairlines, no gradients, no shadows, no rounded card
  styling
- title axis: left-top title alignment for normal content pages

First-pass PPTX layout targets:

| Contract layout | PPTX SVG treatment |
| --- | --- |
| cover / `hero_dark` | accent or ink hero surface with restrained chrome |
| content / evidence | large left-top title, single body block, bottom citation zone |
| `text_split` | two-column Swiss split with left heading and right body |
| Markdown table | ledger-style table with hairlines and truncated cells |
| evidence references | compact bottom footnote lines |

The PPTX renderer does not need to emit upstream `data-layout` values, but the
mapping should be documented beside the HTML mapping so preview and export stay
understandably aligned.

## QA Design

HTML Swiss checks:

- renderer unit tests for Swiss routing, theme mapping, slide section markers,
  and `data-layout` output
- generated HTML smoke using the existing Playwright visual smoke
- Swiss validator smoke using vendored `validate-swiss-deck.mjs`
- regression tests proving non-Swiss renderer hints still use Style A

PPTX Swiss checks:

- unit tests for Swiss SVG tokens, table rendering, text-split layout, and
  evidence reference placement
- real PPTX generate smoke with local `D:\Users\rickylu\dev\ppt-master`
- structural smoke with expected slide count
- PowerPoint visual smoke with `--all-slides`

Cross-output checks:

- `--output both` produces sibling `html/index.html` and
  `ppt-master/exports/*.pptx`
- both outputs resolve the same Swiss accent token for a `swiss-*` deck
- both fail closed when required local assets are missing

## Rollout Plan

1. Vendor Swiss upstream assets and update notice/preflight.
2. Add renderer theme detection and Swiss theme token mapping.
3. Add Swiss HTML rendering for the first-pass contract layouts.
4. Add Swiss HTML validator smoke.
5. Add Swiss PPTX SVG visual mode for the same contract layouts.
6. Add a Swiss fixture and run HTML, PPTX, and `both` smoke checks.
7. Push the completed implementation branch after tests and visual smoke pass.

Each step should be a small TDD slice with a focused commit.

## Risks

- Upstream Swiss layouts are strict and may not map cleanly to all current
  contract layouts. The first pass intentionally maps only the common deckgen
  surfaces.
- The upstream validator is HTML-only. PPTX visual parity still depends on
  focused SVG tests plus PowerPoint screenshot smoke.
- Swiss image layouts are more demanding than current text/table decks. Image
  slots should stay out of the first pass unless a real source package provides
  image assets.
- The current HTML visual smoke expects `data-renderer="html-guizang"` and
  Style A shell markers. It must be updated to accept Swiss markers only for
  Swiss outputs, not globally.

## Acceptance Criteria

- Existing non-Swiss tests and smoke commands still pass.
- A `swiss-ikb` fixture generates valid HTML with
  `data-renderer="html-guizang-swiss"`.
- The generated Swiss HTML passes the vendored Swiss validator.
- The same fixture generates a real PPTX through local `ppt-master`.
- PPTX structural smoke passes with the expected slide count.
- PowerPoint visual smoke with `--all-slides` passes for the Swiss PPTX.
- `--output both` produces sibling Swiss HTML and Swiss-style PPTX outputs from
  one `deck_contract.json`.
