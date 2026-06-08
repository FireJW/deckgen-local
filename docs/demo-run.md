# Demo Run

This demo uses the checked-in synthetic Markdown fixture and writes an ignored local run bundle. It is safe to repeat because the source is public fixture text and the generated output stays under `.tmp/`.

## Command

```powershell
node src\cli\deckgen.mjs generate --source fixtures\generic-markdown\briefing.md --profile briefing --output html --json
```

## Sample Result Shape

```json
{
  "ok": true,
  "command": "generate",
  "source_type": "generic-markdown",
  "profile": "briefing",
  "output": "html",
  "outputs": ["html"],
  "runDir": ".tmp/deckgen/<run-id>",
  "htmlPath": ".tmp/deckgen/<run-id>/html/index.html",
  "pptxPaths": [],
  "qcReportPath": ".tmp/deckgen/<run-id>/qc_report.md"
}
```

## Run Bundle

```text
.tmp/deckgen/<run-id>/
|-- request.json
|-- source_manifest.json
|-- deck_contract.json
|-- content.md
|-- qc_report.md
|-- run_result.json
`-- html/
    |-- index.html
    `-- assets/
```

## Contract Summary

The default fixture produces:

- source type: `generic-markdown`
- profile: `briefing`
- expected output: `html`
- target slide count: `4`
- title: `Deck Generator Briefing`
- source ref: `fixtures/generic-markdown/briefing.md`

## Smoke Gate

```powershell
npm run smoke:run -- --run-dir .tmp\deckgen\<run-id>
```

The smoke gate validates the request, run result, source manifest, deck contract, QC report, generated HTML file, expected output list, and expected slide count. A successful run returns `"ok": true` with an empty `errors` array.

## Public Boundary

Generated run bundles are not committed. Public docs show normalized repo-relative paths only; local absolute paths, generated deck exports, and private source packages stay outside Git.
