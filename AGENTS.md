# AGENTS.md

## Scope
- This repo owns the shared deck generator only.
- Keep source adapters thin.
- Keep outputs in `.tmp/deckgen/<run-id>/`.

## Workflow
- Prefer TDD.
- Keep HTML and PPTX sibling outputs.
- Do not copy business-repo logic into the generator.
