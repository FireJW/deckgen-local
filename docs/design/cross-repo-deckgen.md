# Cross-Repo Deckgen Handoff

`deckgen-local` owns the shared deck generator. Business repositories hand
source packages to it, then receive generated deck artifacts under a local run
directory. The generator stays here instead of in business repos so rendering,
contract validation, quality checks, and future export wiring evolve once,
without copying presentation logic into article, research, or knowledge-base
workflows.

Business repos should keep only thin adapters or launch commands. They remain
responsible for producing truthful source material and repo-specific manifests;
`deckgen-local` is responsible for turning that material into a validated
`deck_contract.json` and sibling deck outputs.

## First Adapters

The first handoff adapters are:

- Article packages with explicit content manifests.
- Research report directories with `report.md`.
- Learning-note packages with a reading-lab manifest.
- Generic Markdown fallback for any source that can provide one grounded
  Markdown file.

These adapters normalize repo-specific inputs into the same internal package:
`content.md` plus `deck_contract.json`. Adapter code should stay thin and avoid
importing business-repo logic into this shared generator.
The shared Markdown adapter assigns the primary local source `id: "primary"`
and attaches structured `evidence_refs` to generated content slides so sibling
HTML and PPTX outputs keep source context by default.

## Source Detection

Markdown file sources remain the compatibility path:

```bash
node src/cli/deckgen.mjs generate --source path/to/briefing.md --profile briefing --output html
```

Directory sources are accepted only when they contain an explicit
`deckgen.source.json` marker. The CLI does not infer package type from a repo or
directory name.

```json
{
  "type": "article-package",
  "primary": "content.md",
  "title": "Optional title override"
}
```

Supported marker types:

- `article-package` -> `article`
- `research-report` -> `briefing`
- `obsidian-note` -> `learning`

For typed packages, a conflicting explicit `--profile` is rejected before the
run bundle is created. `--output` remains the caller-selected output mode, so a
typed package never silently requests PPTX.

The financial-services article publishing pipeline also emits a real
`publish-package.json` artifact. When no `deckgen.source.json` marker exists,
the loader accepts this artifact only if `contract_version` is
`publish-package/v1` and `content_markdown` is non-empty. It is normalized as a
`publish-package` source with the `article` profile. If both files are present,
`deckgen.source.json` remains the explicit override.

The Obsidian learning workflows emit preview packages from `reading-lab.mjs`.
When neither `deckgen.source.json` nor `publish-package.json` exists, the loader
accepts a directory containing `agent-reading-lab.json` with schema
`agent_reading_lab/v1` plus `index.md`. It is normalized as an
`obsidian-reading-lab` source with the `learning` profile, using the package
source title and chapter as the deck title when present.

General report workflows commonly emit a run directory with `report.md`. When
none of the more specific package markers exists, the loader accepts that file
as a `research-report` source with the `briefing` profile. This keeps report
directory support explicit on the artifact filename, not on the parent
directory name.

## Run Directory

Each run writes artifacts under:

```text
.tmp/deckgen/<run-id>/
```

The Phase 1 bundle shape is:

```text
.tmp/deckgen/<run-id>/
  request.json
  source_manifest.json
  content.md
  deck_contract.json
  html/
    index.html
  qc_report.md
```

`request.json` records the requested source, profile, output mode, and workdir.
`source_manifest.json` records the local source files used for the run.
`content.md` is the normalized grounded source text. `deck_contract.json` is the
validated renderer contract. `html/index.html` is the current browser preview
output. `qc_report.md` records validation and output checks. `run_result.json`
records the machine-readable generation result, including `runDir`, `outputs`,
`htmlPath`, `pptxPaths`, and `qcReportPath`.

`scripts/deck-run-smoke.mjs` validates a completed run bundle as a single
contract-driven gate. It reads `request.json`, `source_manifest.json`, and
`deck_contract.json`, validates the contract, checks that `request.outputs` and
`run_result.json.outputs` still match `contract.outputs`, requires
`source_manifest.primary.path`, checks `content.md`, `run_result.json`, and
`qc_report.md`, then verifies each sibling output named by `contract.outputs`:
`html/index.html` for HTML and the newest
`ppt-master/exports/*.pptx` with structural PPTX validation for PPTX. For PPTX
runs, persisted `run_result.json.pptxPaths` must point to real files under that
exports directory, and the structurally validated artifact must be included in
the persisted path list. `run_result.json.qcReportPath` must point to the same
run bundle `qc_report.md` that the gate validates. `run_result.json` must also
repeat the core request metadata from `request.json` (`command`, `source_type`,
`profile`, and `output`) without drift. The gate also requires
`deck_contract.json.source_refs[]` to include the
`source_manifest.json.primary.path` local file, keeping the persisted contract
traceable to the run's primary source.
The gate can optionally run sibling visual checks with `--include-html-visual`
and `--include-pptx-visual`. Those flags shell out to the existing visual smoke
scripts with the same `--run-dir`, keeping browser and PowerPoint dependencies
off the default structural path while still allowing a single command to fail
closed on visual QA when a machine is configured for it. The HTML browser flags
and PPTX visual flags also imply their respective visual gate, so callers can
enable the check by passing the same options they would pass to the dedicated
smoke command. HTML expected-text flags also imply the HTML visual gate because
that content-level check runs against browser-rendered page text.
`--html-expected-text <text>` can be repeated to require key visible page text
during the same run-bundle validation. `--html-expected-text-from-contract`
derives that expected HTML text from `deck_contract.json.title` plus slide
headlines and body text. `--pptx-expected-text <text>` can be repeated to require
key slide text in the extracted PPTX XML during the same run-bundle validation.
`--pptx-expected-text-from-contract` derives that expected text from
`deck_contract.json.title` plus slide headlines and body text.

Editable PowerPoint exports add a sibling `ppt-master/` subtree only when a
real local `ppt-master` checkout is configured and produces a `.pptx`:

```text
.tmp/deckgen/<run-id>/
  ppt-master/
    deck_contract.json
    content.md
    design_spec.md
    notes/
    svg_output/
    svg_final/
    exports/
      <deck>.pptx
```

That subtree is not produced by HTML-only runs.

## Current HTML Command

HTML preview output works now:

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output html
```

The command writes a new `.tmp/deckgen/<run-id>/` bundle in the current working
directory unless `--workdir <path>` is supplied.

## HTML Renderer Boundary

The HTML renderer now uses the vendored `op7418/guizang-ppt-skill` shell as its
base. It keeps the single-file, horizontal swipe deck shape, fixed theme
presets, keyboard navigation, and slide-dot navigation, while reading only
`deck_contract.json`. It maps contract-native layout intents locally, including
`text_split` as a responsive two-column content layout. Markdown table blocks
in slide bodies are rendered as native HTML tables so report-style inputs do not
appear as raw pipe-delimited text. Structured and legacy `evidence_refs` render
as compact reference lines under the slide body.
Leading Markdown blockquote sections are normalized into `layout_intent:
"quote"` slides. Style A renders them as quote blocks, Swiss maps them to
`S09`, and PPTX emits a dedicated quote SVG block.
Single-line Markdown image sections are normalized into `layout_intent:
"image"` slides. Style A and Swiss render them as `<figure>` blocks, Swiss maps
them to `S13`, and local image files are copied into each sibling output under
`assets/images/` before rendering. HTML rewrites `<img>` sources to the copied
asset path. PPTX rewrites the slide body for the ppt-master project and emits an
SVG `<image>` element that the upstream native exporter can embed. Remote image
URLs and data URIs are preserved but not downloaded.

The renderer currently adapts the upstream MIT theme palette values for:

- `ink-classic`
- `indigo-porcelain`
- `forest-ink`
- `kraft-paper`
- `dune`

The upstream MIT template and motion asset are vendored under
`third_party/guizang-ppt-skill/` and preserved in `third_party/NOTICE.md`.

Swiss Style B is available as an opt-in renderer when
`deck_contract.json.theme.renderer_hint` starts with `swiss-`. The first pass
supports `swiss-ikb`, `swiss-lemon`, `swiss-green`, and `swiss-orange`; unknown
`swiss-*` hints fall back to `swiss-ikb` rather than accepting arbitrary colors.
For cross-repo or one-off CLI calls, `--theme <renderer-hint>` overrides the
source package renderer hint before writing the run bundle. This is the
recommended way to request Swiss output from another local repo without editing
the source artifact:

```powershell
node path\to\deckgen-local\src\cli\deckgen.mjs generate --source <source-file-or-package-dir> --output both --theme swiss-ikb --ppt-master-path path\to\ppt-master
```

Callers that need stable automation output can add `--json`. The CLI then emits
a JSON object containing `runDir`, `outputs`, `htmlPath`, `pptxPaths`, and
`qcReportPath`; without `--json`, it keeps the human-oriented `written <runDir>`
line for backward compatibility. The same shape is persisted as
`run_result.json` inside the run bundle.

Generic Markdown sources can pass the hint through supported YAML frontmatter:

```yaml
---
title: Swiss Briefing
theme:
  renderer_hint: swiss-ikb
---
```

Swiss HTML emits `data-renderer="html-guizang-swiss"` and registered
`data-layout` values for each slide. The PPTX project writer reads the same
contract hint and emits Swiss SVG tokens with `data-renderer="ppt-master-swiss"`.
HTML and PPTX remain sibling outputs from `deck_contract.json`; no HTML-to-PPTX
conversion is introduced.

Before any guizang template integration, run:

```bash
npm run preflight:guizang -- --source path/to/guizang-ppt-skill
npm run preflight:guizang -- --source path/to/guizang-ppt-skill-main.zip
```

The preflight checks only local source paths. It accepts a checkout, extracted
archive directory, or `.zip` archive. It fails closed when the source is
missing, when a zip cannot be inspected, when no license file is present, or
when a supported template file cannot be found. Passing this preflight does not
copy files; it only confirms that the next integration slice has auditable local
source material.

The ppt-master environment preflight lives in
`scripts/ppt-master-preflight.mjs`:

```bash
npm run preflight:ppt-master -- --ppt-master-path path/to/ppt-master
```

It checks the local checkout, upstream exporter path, resolved Python
executable, and `python-pptx` import before generation starts. This catches
broken virtual environments and missing exporter dependencies before
`--output pptx` or `--output both` creates a run bundle.

## HTML Visual QA

Browser smoke for HTML output lives in `scripts/html-visual-smoke.mjs`. It opens
a generated `html/index.html` with Playwright, captures a screenshot under
`.tmp/deckgen-visual-smoke/`, and validates:

- page title is present and matches the expected title when provided
- renderer marker is `html-guizang` or `html-guizang-swiss`
- vendored guizang shell markers exist: `#deck` and `#nav`; Style A requires
  its two background canvases, while Swiss output may remove its grid canvas in
  full-canvas mode and is keyed by registered `data-layout` markers on slides
- the generated `html/assets/motion.min.js` file exists when the page imports
  the local motion asset
- external `<script src="...">` tags are absent, so the smoke catches CDN
  script regressions
- slide count is positive and matches the expected count when provided
- body text is non-empty
- expected text snippets are present in the browser-rendered page text when
  callers provide `--expected-text`, or when `--expected-text-from-contract`
  derives snippets from the run bundle contract
- text elements do not visibly overflow their slide bounds
- every deck image finishes loading and exposes positive natural dimensions,
  catching broken copied local image assets
- screenshot file exists and has bytes

The script intentionally keeps Playwright out of repo dependencies. Use
`--module-dir <node_modules>` or `DECKGEN_PLAYWRIGHT_MODULE_DIR` to point at a
local Playwright installation, and use `--browser-executable <path>` when the
Playwright-managed browser cache is unavailable. The default viewport is
`1440x900`; pass `--viewport <width>x<height>` such as `390x844` when checking
mobile-sized output. Pass `--run-dir <dir>` to point at a deckgen run bundle, or
`--html <path>` for a direct `html/index.html` check. In run-dir mode, omitted
title and slide-count expectations are inferred from `deck_contract.json`.
Callers can also pass repeated `--expected-text <text>` flags to require visible
page text, or `--expected-text-from-contract` to derive expected text from
`deck_contract.json.title` plus slide headlines and body text.

## PPTX Structural QA

Structural smoke for PPTX output lives in `scripts/pptx-structural-smoke.mjs`.
It reads a generated `.pptx` as a ZIP package, validates that the required
PowerPoint package entries exist, extracts text from `ppt/slides/slide*.xml`,
and checks that the slide count matches `--expected-slides` when supplied.
Pass `--run-dir <dir>` to point at a deckgen run bundle, `--exports-dir <dir>`
to discover the newest `.pptx` under `ppt-master/exports/`, or `--pptx <path>`
for a direct file check. This is not a visual screenshot check, but it gives a
reusable command-line gate for real PPTX artifacts outside the generate bundle
writer. When `--run-dir` is supplied and `--expected-slides` is omitted, the
script infers the expected count from the run bundle's `deck_contract.json`.
Callers can add repeated `--expected-text <text>` flags to fail closed when key
title or body text is missing from the PPTX slide XML. In `--run-dir` mode,
`--expected-text-from-contract` derives expected text from
`deck_contract.json.title` plus slide headlines and body text.

Visual smoke for PPTX output lives in `scripts/pptx-visual-smoke.mjs`. On
Windows machines with Microsoft PowerPoint available, it reuses the structural
PPTX checks, opens the deck through PowerPoint automation, exports a requested
slide as a PNG, and validates that the screenshot file exists, has bytes, has a
PNG signature, exposes positive IHDR dimensions, and contains enough pixel
diversity to reject near-blank exports. It defaults to slide 1; use
`--slide <n>` to smoke a later table or two-column slide, or `--all-slides` to
export and validate one PNG per slide in a single PowerPoint session. It fails
closed when PowerPoint is unavailable; use `--powerpoint-executable <path>` or
`DECKGEN_POWERPOINT_PATH` when the executable is not in the default Office path.
In `--run-dir` mode, omitted slide-count expectations are inferred from the
same run bundle `deck_contract.json` before PowerPoint is launched. Callers can
also pass repeated `--expected-text <text>` flags to require key PPTX slide XML
text during the same visual smoke path, or `--expected-text-from-contract` to
derive that expected text from `deck_contract.json.title` plus slide headlines
and body text before the PowerPoint automation step starts.
Because this path uses the PowerPoint COM automation API, it also requires an
interactive Windows logon session; detached service-like sessions can fail
before opening PowerPoint with COM error `80070520`.
Runtime failures after structural PPTX validation are normalized into JSON with
`ok: false`, `error_code`, `error`, `next_step`, and `errors[]`, so direct
visual smoke and run-bundle smoke can report actionable environment failures
without appending usage text.

## PPTX Boundary

`--output pptx` and `--output both` intentionally fail closed unless the
configured `ppt-master` checkout has the expected exporter script and that
exporter writes at least one real `.pptx` file.

The integration point is a real local `ppt-master` checkout, configured in this
order:

1. `--ppt-master-path <path>`
2. `DECKGEN_PPT_MASTER_PATH`
3. An existing sibling checkout at `../ppt-master` from the repo root

The wrapper expects this upstream entrypoint:

```text
skills/ppt-master/scripts/svg_to_pptx.py
```

The deckgen renderer converts `deck_contract.json` into a ppt-master project by
writing `notes/`, `svg_output/`, `svg_final/`, `design_spec.md`, and source
copies. It then calls the upstream exporter and verifies
`ppt-master/exports/*.pptx` before the CLI reports success.
When a slide body contains a standard Markdown table block, the project writer
maps it into an SVG table group for `ppt-master` instead of passing raw
pipe-delimited Markdown text through to the slide image. Long table cell text is
compacted and ellipsized to keep fixed-width SVG columns readable. Slides with
structured `table` items may also supply `headers[]` and `rows[][]`; when
`body` is absent those rows are serialized into the same Markdown-shaped table
path for HTML and PPTX. Slides with `layout_intent: "text_split"` are mapped
into two-column SVG blocks so learning profile concept/explanation slides keep
their contract layout in PPTX output.
Slides with `layout_intent: "image"` are mapped into SVG image placeholder
blocks when no local source path is available. During CLI generation, local
Markdown image files are resolved relative to the source Markdown/package file,
copied into `ppt-master/assets/images/`, and emitted as SVG `<image>` elements
with output-relative `href` values. Missing local image files fail closed so
PPTX generation cannot report success with a silently absent visual.
Structured and legacy `evidence_refs` are emitted into both slide SVGs and
per-slide note Markdown so editable PPTX projects keep citation context.

PPTX verification is structural and fail-closed:

- the artifact must be a readable PPTX/ZIP package
- `[Content_Types].xml` and `ppt/presentation.xml` must exist
- `ppt/slides/slide*.xml` count must match `deck_contract.json.slides.length`
- callers can require selected text strings to appear in extracted slide XML
- callers can derive those required strings from the contract title, slide
  headlines, and body text

The QC report records `pptx_slide_count: PASS actual/expected` for generated
PPTX artifacts.

## Output Model

HTML and PPTX are sibling outputs from `deck_contract.json`.

The pipeline is not HTML-to-PPTX conversion. The contract is the stable handoff
format: the HTML renderer reads it to produce `html/index.html`, and the
`ppt-master` renderer reads it to produce editable PowerPoint files under
`ppt-master/exports/`. This keeps preview rendering and editable export aligned
without treating one output as the source for the other.

## Reference Item Validation

`slides[]` items are strict objects with `id`, `role`, `headline`,
`layout_intent`, `evidence_refs`, optional `body`, and optional structured
`items[]`. Slide `id` values must be unique within a deck so renderer anchors,
screenshots, and generated PPTX slide assets stay deterministic. When present,
`items[]` is a non-empty array of `paragraph`, `bullets`, `quote`, `image`, or
`table` blocks, and each block may carry its own `evidence_refs[]` using the same
source-ref rules as the parent slide. Renderers still prefer `body` for
backward compatibility, but when `body` is absent they serialize `items[]` into
the same Markdown-shaped rendering path. Image items participate in the same
local asset-copy step as Markdown image bodies. Item fields are kind-specific:
`paragraph` and `quote` accept `text`; `bullets` accepts `points[]`; `image`
accepts `src` and optional `alt`; `table` accepts either `markdown` or a
structured `headers[]` plus `rows[][]` shape. Structured rows must match the
header width so table renderers do not silently drop cells.

`hard_constraints[]` items must be non-empty strings. `theme` is also strict:
it must include a non-empty `renderer_hint`, may include string `tone`, and
rejects unknown keys so renderer-specific configuration does not drift into
the shared contract without an explicit schema change.

`source_refs[]` items are strict objects with `type`, `path`, `role`, and
optional `id`. Current adapters emit `type: "local_file"`, `path` must be an
absolute local path, and `id` / `role` / `path` values must be outer-trimmed,
single-line strings that stay unique across the source refs so legacy string
evidence does not become ambiguous. Optional `id` values must be unique when
present.

`slides[].evidence_refs[]` may still be a non-empty string for legacy adapter
compatibility, or an object with `id` and optional `source_ref`, `locator`, and
`quote`. Object evidence `id` values must be unique within the slide. When
object-form `source_ref` is present, it must match a declared source ref `id`
so structured evidence stays keyed to explicit source items. Legacy string
evidence can still match a source ref `id`, `role`, or `path` when that label
is unique across the source refs. Evidence object `id`, `source_ref`, `locator`,
and `quote` values must be outer-trimmed, single-line strings when present.
Unknown keys are rejected so downstream renderers do not silently accept drifted
evidence contracts.
