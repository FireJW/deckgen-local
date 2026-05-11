# deckgen-local

Local cross-repo deck generation for Markdown, research packages, and learning notes.

## Current Usage

HTML preview output is available now. The HTML renderer uses the vendored
guizang shell with fixed theme presets; it does not convert HTML into PPTX.
Contract slides with `layout_intent: "text_split"` render as a local
two-column HTML layout, used by the `learning` profile for concept and
explanation slides. Standard Markdown table blocks in slide bodies render as
HTML tables instead of raw pipe-delimited text.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output html
```

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
Omit `--viewport` to use the default desktop smoke size of `1440x900`.

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

Run the structural PPTX smoke against a generated `.pptx` when checking editable
export artifacts without opening PowerPoint:

```powershell
npm run smoke:pptx -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-slides 7
```

`--exports-dir <path>` checks the newest `.pptx` under an exports directory,
and `--pptx <path>` still works for a direct file check.

On Windows machines with Microsoft PowerPoint installed, run the visual PPTX
smoke to export slide 1 as a PNG and verify a real screenshot artifact exists:

```powershell
npm run smoke:pptx:visual -- `
  --run-dir .tmp\deckgen\<run-id> `
  --expected-slides 7
```

Editable PPTX export is wired behind a real local `ppt-master` checkout. CLI requests for `--output pptx` or `--output both` still fail closed unless a checkout is configured and `ppt-master` creates an actual `.pptx` under the run bundle.

Configure the checkout with `--ppt-master-path`, `DECKGEN_PPT_MASTER_PATH`, or a sibling directory named `../ppt-master` from the repo root. The wrapper calls `skills/ppt-master/scripts/svg_to_pptx.py` and verifies `ppt-master/exports/*.pptx` before reporting success.
Standard Markdown table blocks are mapped into SVG table blocks before the
upstream exporter runs, so PPTX output does not receive raw pipe-delimited text
for common report tables. Slides with `layout_intent: "text_split"` are mapped
into two-column SVG blocks before `ppt-master` exports the PPTX.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output pptx --ppt-master-path D:/Users/rickylu/dev/ppt-master
```
