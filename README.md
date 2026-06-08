# deckgen-local

`deckgen-local` is a contract-first local deck generator for Markdown, article packages, report folders, and learning notes. It turns source material into a validated `deck_contract.json` plus sibling HTML and optional PPTX outputs.

This repository is packaged as a public portfolio version. It keeps the reusable deck-generation architecture visible while excluding local run bundles, private source packages, generated decks, and machine-specific paths.

## What It Does

- Loads Markdown files and explicit source-package directories.
- Normalizes source material into a shared deck contract.
- Renders local HTML preview decks through a vendored Guizang-style template shell.
- Optionally hands the same contract to a local `ppt-master` checkout for editable PPTX export.
- Validates run bundles with structural and visual smoke gates.
- Includes a local template lab for comparing HTML deck templates without making them runtime dependencies.

## Repository Layout

```text
src/cli/                  CLI entrypoints and source loading
src/adapters/             Thin source adapters for article, report, note, and Markdown packages
src/contract/             Deck contract schema, planner, evidence, and validation helpers
src/renderers/            HTML and PPTX project renderers
src/qc/                   Run-bundle, HTML, and PPTX smoke checks
src/lab/                  Local template evaluation lab
scripts/                  CLI wrappers for preflight, smoke, lab, and design-pack workflows
fixtures/                 Public sample inputs and demo HTML surfaces
third_party/              Vendored Guizang template assets with license notice
tests/                    Node test suite
```

## Quick Start

```powershell
npm install
npm test
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\briefing.md --profile briefing --output html
```

Generated run bundles are written under `.tmp/deckgen/<run-id>/` and are ignored by Git.

## Source Packages

Directory sources are accepted only when they contain an explicit marker such as `deckgen.source.json`.

```json
{
  "type": "article-package",
  "primary": "content.md",
  "title": "Optional title override"
}
```

Supported package types:

- `article-package` -> `article`
- `research-report` -> `briefing`
- `obsidian-note` -> `learning`

The loader also supports public fixture forms for publish packages, reading-lab packages, and report directories when the expected manifest file is present.

## HTML Output

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\briefing.md --profile briefing --output html --json
```

The result includes the run directory, HTML path, requested outputs, and QC report path. The same shape is written to `run_result.json` inside the run bundle.

See [docs/demo-run.md](docs/demo-run.md) for a public-safe sample run shape, run-bundle map, and smoke command.

## PPTX Output

PPTX export is optional and requires a local `ppt-master` checkout supplied at runtime.

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\briefing.md --profile briefing --output both --ppt-master-path path\to\ppt-master --json
```

The repository does not vendor `ppt-master` or generated PPTX files.

## Template And Runtime Boundaries

The vendored Guizang template assets are kept under `third_party/guizang-ppt-skill/` with their original license. External HTML-agent/editor projects are treated as template or export references, not runtime dependencies.

Run the local preflight before integrating another Guizang source:

```powershell
npm run preflight:guizang -- --source path\to\guizang-ppt-skill
```

Run a generated bundle smoke gate:

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id>
```

## Public Safety

The public package excludes:

- `.tmp/` run bundles
- local source-package directories
- generated images and deck exports
- machine-specific absolute paths
- API keys, cookies, sessions, or account credentials

Examples use placeholder paths such as `path\to\ppt-master`; provide real paths only in your local shell.

## License

MIT. See [LICENSE](LICENSE).
