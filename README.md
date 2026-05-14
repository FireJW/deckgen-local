# deckgen-local

Local cross-repo deck generation for Markdown, research packages, and learning notes.

## Current Usage

HTML preview output is available now. The HTML renderer uses the vendored
guizang shell with fixed theme presets; it does not convert HTML into PPTX.
Contract slides with `layout_intent: "text_split"` render as a local
two-column HTML layout, used by the `learning` profile for concept and
explanation slides. Standard Markdown table blocks in slide bodies render as
HTML tables instead of raw pipe-delimited text. Structured `table` items can
also use `headers` and `rows`; they are serialized through the same table path
for HTML and PPTX.
Markdown list sections are normalized into structured `bullets` items and
render as real lists in HTML and PPTX rather than paragraph text with hyphens.
Leading Markdown blockquote sections (`>` lines) are promoted to quote slides
and render as quote layouts in HTML and PPTX.
Single-line Markdown image sections (`![alt](path)`) are promoted to image
slides. Local image paths are copied into each generated output bundle under
`assets/images/` and rewritten to output-relative paths. Remote image URLs and
data URIs are preserved but not downloaded.
Generated slide contracts also carry structured `items[]` blocks alongside the
legacy `body` text. Current HTML and PPTX renderers keep `body` as the primary
compatibility path, but fall back to `items[]` when `body` is absent; local
image items are copied and rewritten the same way as Markdown image bodies.
Item fields are kind-specific: `paragraph` and `quote` use `text`, `bullets`
uses `points`, `image` uses `src` plus optional `alt`, and `table` uses
`markdown` or structured `headers`/`rows`. All item kinds may carry
`evidence_refs`.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output html
```

Swiss Style B can be selected per source with Markdown frontmatter. It stays
opt-in and affects both HTML preview and PPTX SVG project output when the same
contract is rendered:

```yaml
---
title: Swiss Briefing
theme:
  renderer_hint: swiss-ikb
---
```

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\swiss-briefing.md --profile briefing --output both --ppt-master-path D:\Users\rickylu\dev\ppt-master
npm run smoke:swiss -- .tmp\deckgen\<run-id>\html\index.html
```

For one-off calls from another repo or Codex session, pass the renderer hint on
the command line instead of editing the source Markdown:

```powershell
node D:\Users\rickylu\dev\deckgen-local\src\cli\deckgen.mjs generate --source <source-file-or-package-dir> --profile briefing --output both --theme swiss-ikb --ppt-master-path D:\Users\rickylu\dev\ppt-master
```

Add `--json` when another script or Codex session needs a stable machine-readable
result instead of parsing `written <run-dir>`:

```powershell
node D:\Users\rickylu\dev\deckgen-local\src\cli\deckgen.mjs generate --source <source-file-or-package-dir> --output both --theme swiss-ikb --ppt-master-path D:\Users\rickylu\dev\ppt-master --json
```

The same result shape is also written to `run_result.json` inside the generated
run bundle.

Directory sources are supported when they include an explicit
`deckgen.source.json` marker. This keeps cross-repo package detection
fail-closed instead of guessing from directory names.

```bash
node src/cli/deckgen.mjs generate --source fixtures/source-packages/article/basic --output html
```

Minimal marker:

```json
{
  "type": "article-package",
  "primary": "content.md",
  "title": "Optional title override"
}
```

Supported package `type` values are `article-package`, `research-report`, and
`obsidian-note`; their profiles are inferred as `article`, `briefing`, and
`learning` respectively. Passing a conflicting `--profile` fails closed.

Article publish outputs from the financial-services repos can also be passed
directly when the directory contains `publish-package.json` with
`contract_version: "publish-package/v1"` and non-empty `content_markdown`.
This path is treated as an `article` source. `deckgen.source.json` still takes
precedence when both files are present.

Obsidian `reading-lab` preview packages can also be passed directly when the
directory contains `agent-reading-lab.json` with `schema:
"agent_reading_lab/v1"` and an `index.md`. This path is treated as a
`learning` source.

Report run directories can be passed directly when they contain `report.md`.
This path is treated as a `research-report` source with the `briefing` profile.

Run the browser/screenshot smoke against a generated `html/index.html` when
layout regressions matter. The repo does not vendor Playwright, so pass a local
or bundled `node_modules` directory that contains `playwright`; if Playwright's
managed browser cache is missing, pass an installed browser executable.
The smoke also checks deck images: every `<img>` must finish loading with
positive natural dimensions, so copied local image assets cannot silently break.

```powershell
npm run smoke:html -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-title "Deck Generator Briefing" `
  --expected-slides 4 `
  --module-dir C:\Users\rickylu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules `
  --browser-executable "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" `
  --viewport 390x844
```

`--html <path>` still works for a direct `html/index.html` check.
Omit `--viewport` to use the default desktop smoke size of `1440x900`. When
`--run-dir` is used and title/slide expectations are omitted, the script reads
them from `deck_contract.json`. Add repeated `--expected-text "<text>"` flags
to require visible page text, or pass `--expected-text-from-contract` in
`--run-dir` mode to derive expected text from the deck title, slide headlines,
and slide body text.

Before copying any upstream guizang template file, run the local source
preflight. This validates that a local checkout, extracted archive, or `.zip`
archive has a license file and a supported template path; it does not vendor
files.

```powershell
npm run preflight:guizang -- --source D:\Users\rickylu\dev\guizang-ppt-skill
npm run preflight:guizang -- --source D:\下载\guizang-ppt-skill-main.zip
```

Before relying on editable PPTX export on a machine, run the ppt-master
preflight. It checks the checkout path, upstream exporter, resolved Python
environment, and `python-pptx` import before a generation run starts:

```powershell
npm run preflight:ppt-master -- --ppt-master-path D:\Users\rickylu\dev\ppt-master
```

Run the combined run-bundle smoke when you want one local gate that checks the
traceability files (`request.json`, `source_manifest.json`), generated
`run_result.json`, `deck_contract.json`, `content.md`, `qc_report.md`, and every
sibling output requested by the contract. It verifies `html/index.html` for HTML
output and runs structural PPTX validation for PPTX output. For PPTX runs, the
persisted `run_result.json.pptxPaths` entries must exist under
`ppt-master/exports/`, and the structurally validated artifact must be one of
those recorded paths. The persisted `run_result.json.qcReportPath` must also
point back to the run bundle's `qc_report.md`. Core request metadata in
`run_result.json` (`command`, `source_type`, `profile`, and `output`) must match
`request.json`. The contract must also carry a `source_refs[]` entry whose local
file path matches `source_manifest.json.primary.path`, so bundle smoke catches a
deck contract that has drifted away from the source material:

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id>
```

For a slower one-command QA gate, opt into sibling visual checks from the same
run bundle. HTML visual smoke reuses the browser options from `smoke:html`;
PPTX visual smoke reuses the PowerPoint options from `smoke:pptx:visual`.
These checks are off by default so CI and quick local validation do not require
Playwright or an interactive PowerPoint session. Pass repeated
`--html-expected-text "<text>"` flags when the same run-bundle smoke should also
check visible HTML page text, or pass `--html-expected-text-from-contract` to
derive the expected HTML text from the deck title, slide headlines, and slide
body text in `deck_contract.json`. Pass repeated
`--pptx-expected-text "<text>"` flags when the same run-bundle smoke should also
check PPTX slide XML for key text, or pass
`--pptx-expected-text-from-contract` to derive the expected PPTX text from the
deck title, slide headlines, and slide body text in `deck_contract.json`:
Supplying HTML browser or HTML expected-text flags automatically enables the
HTML visual gate, and supplying PPTX visual flags automatically enables the PPTX
visual gate.

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id> `
  --include-html-visual `
  --module-dir C:\path\to\node_modules `
  --browser-executable "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id> `
  --html-expected-text-from-contract `
  --module-dir C:\path\to\node_modules `
  --browser-executable "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id> `
  --pptx-expected-text-from-contract
```

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id> `
  --include-pptx-visual `
  --pptx-slide 2
```

Run the structural PPTX smoke against a generated `.pptx` when checking editable
export artifacts without opening PowerPoint:

```powershell
npm run smoke:pptx -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-slides 7
```

`--exports-dir <path>` checks the newest `.pptx` under an exports directory,
and `--pptx <path>` still works for a direct file check. When `--run-dir` is
used and `--expected-slides` is omitted, the script reads
`deck_contract.json.target_slide_count` from the run bundle. Add one or more
`--expected-text "<text>"` flags when you need a content-level gate that checks
slide XML for key title or body text without launching PowerPoint:

```powershell
npm run smoke:pptx -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-text "Deck Generator Briefing" `
  --expected-text "HTML preview and PPTX export"
```

In `--run-dir` mode, `--expected-text-from-contract` derives expected PPTX text
from `deck_contract.json.title` plus slide headlines and body text:

```powershell
npm run smoke:pptx -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-text-from-contract
```

On Windows machines with Microsoft PowerPoint installed, run the visual PPTX
smoke to export a slide as a PNG and verify a real screenshot artifact exists.
It defaults to slide 1; pass `--slide <n>` when checking a later table or
two-column slide, or `--all-slides` to export and validate one PNG per slide:
the PNG check validates dimensions and pixel diversity, rejecting near-blank
exports instead of accepting any syntactically valid image.
This smoke uses the PowerPoint COM automation API and must run from an
interactive Windows logon session; service-like or detached sessions can fail
before opening PowerPoint with COM error `80070520`.
When PowerPoint launch, COM automation, or screenshot export fails after the
structural checks pass, the script writes a machine-readable JSON failure to
stdout with `ok: false`, `error_code`, `error`, `next_step`, and `errors[]`.
Add one or more `--expected-text "<text>"` flags when the same visual smoke
should also fail closed on missing PPTX slide XML text before launching
PowerPoint:

```powershell
npm run smoke:pptx:visual -- `
  --run-dir .tmp\deckgen\<run-id> `
  --slide 2
```

```powershell
npm run smoke:pptx:visual -- `
  --run-dir .tmp\deckgen\<run-id> `
  --all-slides
```

In `--run-dir` mode, visual smoke also infers the expected slide count from
`deck_contract.json` when `--expected-slides` is omitted. Add
`--expected-text-from-contract` to derive expected PPTX text from
`deck_contract.json.title` plus slide headlines and body text, then perform
both structural checks before launching PowerPoint.

```powershell
npm run smoke:pptx:visual -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-text-from-contract `
  --slide 2
```

Editable PPTX export is wired behind a real local `ppt-master` checkout. CLI requests for `--output pptx` or `--output both` still fail closed unless a checkout is configured and `ppt-master` creates an actual `.pptx` under the run bundle.

Configure the checkout with `--ppt-master-path`, `DECKGEN_PPT_MASTER_PATH`, or a sibling directory named `../ppt-master` from the repo root. The wrapper calls `skills/ppt-master/scripts/svg_to_pptx.py` and verifies `ppt-master/exports/*.pptx` before reporting success.
Standard Markdown table blocks are mapped into SVG table blocks before the
upstream exporter runs, so PPTX output does not receive raw pipe-delimited text
for common report tables. Structured table items with `headers` and `rows` use
the same SVG table block when `body` is absent. Slides with
`layout_intent: "text_split"` are mapped into two-column SVG blocks before
`ppt-master` exports the PPTX.
Slides with `layout_intent: "image"` are mapped into editable SVG image
blocks. When the Markdown image points at a local file, the asset is copied
under `ppt-master/assets/images/` and emitted as an SVG `<image>` element so
the upstream native exporter can embed it into the generated PPTX. Missing
local image files fail the run instead of producing a false-success deck.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output pptx --ppt-master-path D:/Users/rickylu/dev/ppt-master
```
