# deckgen-local

Local cross-repo deck generation for Markdown, research packages, and learning notes.

## Current Usage

HTML preview output is available now:

```bash
node src/cli/deckgen.mjs generate --source fixtures/generic-markdown/briefing.md --profile briefing --output html
```

Editable PPTX export is not implemented in Phase 1. CLI requests for `--output pptx` or `--output both` intentionally fail closed until the `ppt-master` wrapper is wired to a real local checkout.

The `pptMasterPath` key in `deckgen.config.example.json` is the future integration point for that local `ppt-master` checkout.
