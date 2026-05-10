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

- Article package for `financial-services-plugins-clean`.
- Research report for `financial-services-plugins` and
  `financial-services-plugins-clean`.
- Obsidian note for `obsidian-kb-v2`.
- Generic Markdown fallback for any source that can provide one grounded
  Markdown file.

These adapters normalize repo-specific inputs into the same internal package:
`content.md` plus `deck_contract.json`. Adapter code should stay thin and avoid
importing business-repo logic into this shared generator.

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
output. `qc_report.md` records validation and output checks.

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

## Output Model

HTML and PPTX are sibling outputs from `deck_contract.json`.

The pipeline is not HTML-to-PPTX conversion. The contract is the stable handoff
format: the HTML renderer reads it to produce `html/index.html`, and the future
PPTX renderer will read the same contract to produce editable PowerPoint files
under `ppt-master/`. This keeps preview rendering and editable export aligned
without treating one output as the source for the other.
