# Security And Privacy

`deckgen-local` is a public-safe deck generation toolkit. Public source should contain contracts, renderers, tests, and sample fixtures only.

## Not Committed

- API keys, provider tokens, or account credentials.
- Private source packages, generated decks, run bundles, screenshots, or logs.
- Local browser profiles, sessions, cookies, or automation state.
- Machine-local paths or private cross-repo handoff documents.

## Local Configuration

Keep generated output under ignored folders such as `output/` or `.tmp/`. Use placeholder paths in examples when optional local tools are required.

## Operational Boundary

The repository turns local source packages into deck contracts and preview outputs. Private source truth should stay in the caller's local workspace, not in this public repository.
