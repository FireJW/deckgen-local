# HTML Anything Local Template Lab Design

## Context

`deckgen-local` is the shared local generator for Markdown, article packages,
research reports, and learning notes. It owns the stable contract boundary:
source packages are normalized into `content.md` and `deck_contract.json`, then
rendered into sibling outputs such as local HTML preview and editable PPTX.

`nexu-io/html-anything` is a local-first Next.js application for turning user
content into self-contained HTML through local coding-agent CLIs. Its useful
pieces for this repo are the skill-folder template model, the visual prompt
constraints, the example HTML assets, and the browser export experiments. Its
full runtime is not a good dependency for `deckgen-local`, because it has its
own web app, agent-spawn loop, SSE protocol, and trust model.

## Goal

Create a small, auditable path for evaluating and importing selected
`html-anything` template ideas into `deckgen-local` without replacing the
existing contract-first generator.

The first deliverable is a local template lab that can compare selected
`html-anything` skills against real `deckgen-local` fixtures and publish
evidence for which templates should become native deckgen renderers, themes, or
export helpers.

## Non-Goals

- Do not embed the full `html-anything` Next.js app into `deckgen-local`.
- Do not make `html-anything` spawn agents inside business repo workdirs.
- Do not bypass `deck_contract.json`, run bundles, or smoke gates.
- Do not route WeChat, X, Xiaohongshu, or Zhihu publishing through the lab.
- Do not import all 75 upstream templates.
- Do not accept generated HTML as the source of truth for PPTX generation.

## Recommended Approach

Use a three-stage route:

1. **Template Lab**: create a local, isolated comparison harness under
   `deckgen-local` that records upstream template metadata, references example
   HTML, and generates side-by-side evidence from existing deckgen fixtures.
2. **Native Template Packs**: promote only proven templates into
   `deckgen-local` as renderer or theme packs that consume `deck_contract.json`.
3. **Optional Export Helpers**: selectively port narrow export utilities such
   as CSS inlining or high-DPI PNG screenshot support, keeping them as local
   post-processing helpers over deckgen HTML output.

This keeps the upstream repo useful as a design source while preserving local
contracts, reproducible artifacts, and existing verification commands.

## First Templates

The first evaluation set should stay small:

| Upstream skill | Local question | Likely destination |
| --- | --- | --- |
| `deck-swiss-international` | Is its stronger editorial grid better than current Swiss output? | `html-guizang` / PPTX theme refinement |
| `deck-guizang-editorial` | Which magazine-deck patterns improve article and report decks? | Optional deck renderer theme |
| `article-magazine` | Can article packages become a better long-form HTML reading artifact? | Article HTML preview mode |
| `card-xiaohongshu` or `social-carousel` | Can deckgen emit local XHS card review artifacts from existing source packages? | Separate social-card output family |
| `data-report` | Can tabular research output become denser and more useful in HTML? | Briefing/report layout refinement |
| `video-hyperframes` | Can a deck contract hand off to HyperFrames frame scripts later? | Future export adapter only |

The lab should record rejected templates too, with a short reason. The goal is
not to expand surface area; it is to identify the few templates that improve
existing local workflows.

## Architecture

Add a new lab layer that is explicitly separate from production renderers:

```text
deckgen-local/
  docs/superpowers/specs/
  .tmp/html-anything-lab/<run-id>/
    request.json
    upstream-template-index.json
    fixture-results/
    report.md
```

The lab reads existing fixtures and generated run bundles. It does not write
inside `src/renderers/` until a template has been reviewed and promoted through
a later implementation plan.

Core components:

- `upstream-template-index`: a local metadata file that records selected
  upstream skill ids, source URLs, license notes, example paths, and intended
  local destination.
- `lab runner`: a script that compares selected templates against local
  fixtures and writes `.tmp/html-anything-lab/<run-id>/report.md`.
- `promotion notes`: a section in the report that states whether a template
  should become a renderer theme, export helper, fixture-only reference, or
  rejection.

## Data Flow

1. Select a local source fixture or existing deckgen run bundle.
2. Load the deckgen source material and current `deck_contract.json`.
3. Load selected upstream template metadata and example references.
4. Produce a comparison report that answers:
   - what content shape the template expects
   - what deckgen contract fields it can consume
   - what fields are missing
   - what export behavior is reusable
   - whether the result should be promoted
5. If promoted later, implement a native deckgen renderer path that consumes
   `deck_contract.json` directly.

No production data flow should call the upstream Next.js server or its
`POST /api/convert` endpoint.

## Security And Trust Boundary

The upstream app is useful partly because it can spawn local coding-agent CLIs,
but that is the wrong trust boundary for `deckgen-local`.

Local rules:

- The lab must be read-only with respect to business repos.
- Agent-generated HTML is allowed only as a comparative artifact under `.tmp`.
- Promotion into `src/renderers/` must be hand-written or generated through the
  normal Codex development workflow, with tests.
- No lab command may run with broad agent bypass flags.
- No lab command may enable network access by default.
- Any future browser export helper must run against local deckgen HTML output,
  not against arbitrary user-provided HTML from an untrusted page.

## Export Helper Evaluation

Only narrow export mechanics should be considered:

- CSS inlining for WeChat-compatible copy/paste.
- High-DPI PNG generation from local HTML.
- Clipboard payload shaping for review workflows.

These helpers should be optional post-processors:

```text
deck_contract.json -> html/index.html -> export helper -> .tmp export artifact
```

They must not become publishing tools. Live platform pushes remain outside this
scope and require separate approval gates.

## Testing Strategy

The lab itself should be testable without a browser first:

- metadata parser tests for selected template entries
- report generation tests from static fixtures
- fail-closed tests for unknown template ids or missing upstream license notes
- no-write tests proving business repo paths are not modified

Promotion of a template into production renderers requires the existing gates:

- `npm.cmd test`
- `npm run smoke:run -- --run-dir <run-dir>`
- HTML visual smoke when layout is user-facing
- PPTX structural and visual smoke when PPTX output is affected

## Rollout Plan

1. Write this design and review the boundary.
2. Add a small `html-anything` template index fixture with the first selected
   templates and source links.
3. Add a lab runner that produces a markdown comparison report under `.tmp`.
4. Run the lab against one generic Markdown fixture and one publish-package
   fixture.
5. Review the report and choose one promotion target.
6. Write a separate implementation plan for the first promoted native renderer
   or export helper.

## Acceptance Criteria

- `deckgen-local` remains the only owner of the local generation contract.
- The lab can evaluate selected upstream templates without invoking the
  upstream Next.js app.
- Reports are written under `.tmp/html-anything-lab/`.
- No business repo files are modified by the lab.
- At least one template is classified as promote, hold, or reject with a clear
  reason.
- Any promoted implementation path keeps HTML and PPTX as sibling renderers
  from `deck_contract.json`.

## First-Slice Decisions

- The first implementation slice does not promote a production renderer. It
  only builds the lab index, report generator, and fixture comparison output.
- Upstream example HTML is referenced by source URL plus recorded checksum in
  the first slice. Vendoring is reserved for a later promotion step where the
  exact artifact becomes part of a production renderer or stable fixture.
- Export helper work waits until the lab report identifies a concrete review
  workflow that needs CSS inlining, PNG export, or clipboard payload shaping.
- The first promotion decision is made from the lab report, not from the
  initial upstream README scan.
