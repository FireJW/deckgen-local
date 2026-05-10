# deckgen-local

Local cross-repo deck generation for Markdown, research packages, and learning notes.

## Current Usage

HTML preview output is available now. The HTML renderer uses a local
guizang-compatible horizontal swipe shell with fixed theme presets; it does not
convert HTML into PPTX and does not vendor the upstream guizang template or
motion assets. Contract slides with `layout_intent: "text_split"` render as a
local two-column HTML layout, used by the `learning` profile for concept and
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
  --html .tmp\deckgen\<run-id>\html\index.html `
  --expected-title "Deck Generator Briefing" `
  --expected-slides 4 `
  --module-dir C:\Users\rickylu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules `
  --browser-executable "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
```

Editable PPTX export is wired behind a real local `ppt-master` checkout. CLI requests for `--output pptx` or `--output both` still fail closed unless a checkout is configured and `ppt-master` creates an actual `.pptx` under the run bundle.

Configure the checkout with `--ppt-master-path`, `DECKGEN_PPT_MASTER_PATH`, or a sibling directory named `../ppt-master` from the repo root. The wrapper calls `skills/ppt-master/scripts/svg_to_pptx.py` and verifies `ppt-master/exports/*.pptx` before reporting success.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output pptx --ppt-master-path D:/Users/rickylu/dev/ppt-master
```
