# Product Design Plugin Bridge

Source: `openai-curated-remote/product-design`
Checked: 2026-06-06
Mode: local bridge, no dependency install

## Purpose

Use this bridge when a frontend task would benefit from the Product Design plugin, but the current Codex session may or may not expose `@Product Design` as a callable plugin. The bridge keeps the decision operational: call the plugin when it is available; otherwise use the local `frontend-design-boost` workflow with the same design gates.

## What The Plugin Adds

The local cache for Product Design `0.1.43` contains these useful skills:

- `user-context`: saved product URLs, Figma files, screenshots, Storybook links, tokens, brand assets, and share targets.
- `get-context`: mandatory design-brief playback before ideation or build work.
- `ideate`: generate exactly three image-based product directions after the brief is confirmed.
- `prototype`: route coded prototype work from a URL, image, mockup, Figma frame, existing code, or product idea.
- `url-to-code`: recreate a live URL as a runnable frontend-only prototype from captured source evidence.
- `image-to-code`: implement a selected image, screenshot, mockup, or ImageGen result as a responsive interactive frontend.
- `audit`: screenshot-backed UX, design, and accessibility review of a product flow.
- `design-qa`: blocking comparison of a source visual target against the rendered implementation; the report is `design-qa.md`.
- `share`: publish or hand off a runnable prototype after the user chooses a share target.

## Routing Rule

Use this order:

1. If `@Product Design` is callable in the current session, use it for product-idea exploration, prototype work, URL/image-to-code, product-flow audits, and design QA.
2. If it is cached but not callable, run `npm.cmd run readiness:frontend-design-boost:product-design` to inspect the local plugin package, then continue with the local fallback below.
3. If it is missing, do not block ordinary HTML/React/Tailwind work. Continue with `frontend-design-boost`, Browser/Playwright, `imagegen`, and the repo-native QA gates.

## Local Fallback

When Product Design is not callable, preserve these plugin behaviors locally:

- Product brief gate: play back the product, visual source, interactivity level, constraints, and target workflow before implementation.
- No Visual Target, No Build: a written brief alone is not enough for a new product, redesign, clone, or image-to-code build. Collect a URL, screenshot, Figma/mock image, existing code surface, or generate three `gpt-image-2` directions first.
- Three-direction ideation: use `flow:frontend-design-boost:image` and the image-assisted workflow when the user needs visual options before choosing one.
- Source evidence first: for URL or screenshot work, capture desktop, mobile, visible states, assets, typography, spacing, controls, and interactions before coding.
- Design QA gate: before handoff, compare source visual truth and rendered implementation at the same viewport and state. Save the result as `design-qa.md` when the work is prototype-like.
- Fallback evidence bundle: for debugging or critique, use `frontend_debug_evidence_bundle/v1` to combine server logs, browser console, network requests, screenshots, component catalogs, and action catalogs.

## Approval Boundaries

- Do not install dependencies, run Product Design bootstrap, create a new prototype folder outside the selected repo, deploy, or save Product Design user context without explicit approval.
- Do not treat a cached plugin as callable. Current-session tool exposure is the source of truth.
- Do not copy Product Design plugin code into this repo. Localize the method, not the runtime package.

## Readiness Command

Run:

`npm.cmd run readiness:frontend-design-boost:product-design`

The command writes nothing. It reports whether the Product Design plugin cache is present, which core skills exist, whether direct `@Product Design` callability was assumed, and which local fallback workflow should be used.

## Product Design Task Brief Preflight

Before prototype-like work, generate a repo-local task brief preflight:

`npm.cmd run brief:frontend-design-boost:product-design -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md`

Use `--visual-source <url-or-path>` when a URL, screenshot, mockup, image, or code surface already exists. The command writes `product-design-task-brief.json` and `product-design-task-brief.md` under `.tmp/frontend-design-boost/product-design-brief/` by default.

The preflight does not call Product Design. It plays back the brief, checks the Product Design bridge, chooses the route after `get-context`, applies No Visual Target, No Build, lists source evidence requirements, and calls out when `design-qa.md` is required.

## Product Design Ideation Scaffold

When Product Design `ideate` is needed but Product Design is not callable, scaffold the three-direction visual exploration gate:

`npm.cmd run ideate:frontend-design-boost:product-design -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md --surface-type desktop-dashboard --mode broad-exploration`

Validate an existing report with:

`npm.cmd run ideate:frontend-design-boost:product-design -- --check <product-design-ideation.md>`

The scaffold writes `product-design-ideation.md` and `product-design-ideation-report.json`. It creates exactly three independent concept directions and Image Gen prompt seeds, but starts with `final result: blocked` because it does not generate images, attach visual references to Image Gen, or ask the user to choose a rendered direction. Keep build work blocked until three independent images exist and the user selects one visual target.

## Product Design Design QA Scaffold

When `design-qa.md` is required but Product Design is not callable, scaffold a local report:

`npm.cmd run design-qa:frontend-design-boost:product-design -- --source <source-screenshot-or-url> --implementation <implementation-screenshot-or-url> --viewport 1440x900 --state default`

Validate an existing report with:

`npm.cmd run design-qa:frontend-design-boost:product-design -- --check <design-qa.md>`

The scaffold starts with `final result: blocked`. It is valid as a report template, not as a handoff. It must remain blocked until the source visual truth and rendered implementation are captured, placed in the same comparison input, checked at the same viewport/state, and reviewed across the required fidelity surfaces: fonts, spacing, colors, image fidelity, and copy/content.

## Product Design Flow Audit Scaffold

When a Product Design-style UX/design/accessibility audit is needed but Product Design is not callable, scaffold a local flow audit report:

`npm.cmd run audit:frontend-design-boost:product-design -- --surface <path-or-url> --flow "triage dashboard" --steps "Open dashboard;Inspect priority signals" --destination local-folder`

Validate an existing report with:

`npm.cmd run audit:frontend-design-boost:product-design -- --check <product-design-audit.md>`

The scaffold writes `product-design-audit.md` and `product-design-audit-report.json`. It starts with `final result: blocked` because it does not capture screenshots, control a browser, place screenshots in Figma, or inspect accessibility. Keep it blocked until every important step has accepted current-run screenshot evidence or a named blocker, notes are tied to those steps, and UX/design/accessibility findings include clear evidence limits.

## Handoff Checklist

When this bridge influenced frontend work, include:

- Whether `@Product Design` was callable in the current session.
- Product brief source and visual target.
- Product Design skill route used or local fallback route used.
- Screenshots, source evidence, or `gpt-image-2` direction assets.
- `design-qa.md` status for prototype-like work, or the normal `frontend-design-boost` screenshot QA results for repo-native UI edits.
