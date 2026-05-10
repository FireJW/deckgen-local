# deckgen-local

Local cross-repo deck generation for Markdown, research packages, and learning notes.

## Current Usage

HTML preview output is available now. The HTML renderer uses a local
guizang-compatible horizontal swipe shell with fixed theme presets; it does not
convert HTML into PPTX and does not vendor the upstream guizang template or
motion assets.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output html
```

Editable PPTX export is wired behind a real local `ppt-master` checkout. CLI requests for `--output pptx` or `--output both` still fail closed unless a checkout is configured and `ppt-master` creates an actual `.pptx` under the run bundle.

Configure the checkout with `--ppt-master-path`, `DECKGEN_PPT_MASTER_PATH`, or a sibling directory named `../ppt-master` from the repo root. The wrapper calls `skills/ppt-master/scripts/svg_to_pptx.py` and verifies `ppt-master/exports/*.pptx` before reporting success.

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output pptx --ppt-master-path D:/Users/rickylu/dev/ppt-master
```
