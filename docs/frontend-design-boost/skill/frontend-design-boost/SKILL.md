---
name: frontend-design-boost
description: Use when building or revising HTML, web pages, product UI, dashboards, React components, Tailwind layouts, landing pages, or any frontend surface where visual quality, responsive behavior, interaction states, or screenshot QA matter.
---

# Frontend Design Boost

## Overview

Use this skill before frontend implementation begins.
It turns vague UI work into a repeatable design preflight, build discipline, and screenshot QA loop.

## Required Flow

1. Classify the page type before coding.
2. State the audience, primary action, and density target.
3. Choose the smallest component strategy that fits the repo.
4. Define design tokens before layout.
5. Name visual references or say that none were available.
6. Build the UI with complete states.
7. Capture desktop and mobile screenshots.
8. Fix overflow, overlap, weak hierarchy, and missing states before completion.

## Companion Skill Routing

Use existing skills for the workflow they already own:

- Use `brainstorming` first for creative frontend implementation; keep it short when direction is already fixed.
- Use `imagegen` when the task needs project-bound bitmap visuals.
- Use `test-driven-development` when UI behavior or component logic changes.
- Use `playwright` for browser screenshots, snapshots, and rendered UI debugging.
- Use `deep-research-dag` when the task needs current external references or more than one source family.
- Use `requesting-code-review` after substantial frontend implementation when review-agent use is allowed; otherwise do a local review pass.
- Use `verification-before-completion` before final success claims.
- Use `prompt-patterns` when turning the result into a reusable prompt or goal.

For more detail, read `references/companion-skills.md`.

## Page Type Rules

- Operational dashboard: dense, quiet, utilitarian, scan-first.
- Product UI: task-first, predictable controls, clear states.
- Editorial page: hierarchy, rhythm, and readable long-form layout.
- Landing page: only when explicitly requested; make the hero real.
- Social card or carousel: single-message composition with concise copy.
- Data report: tables, charts, evidence, and comparison density.

Do not use landing-page composition for dashboards or operational tools.

## Component Strategy

Prefer existing repo patterns first.
If the repo has no strong pattern:

- Use shadcn/ui for accessible product controls and app primitives.
- Use Tailwind CSS for tokenized spacing, responsive layout, and state styling.
- Use Magic UI only when polished marketing motion is appropriate.
- Use React Bits for useful React interaction patterns, not as structure replacement.
- Treat screenshot-to-code, Magic MCP, and prompt packs as reference sources, not runtime dependencies.

Do not add dependencies without explicit approval.

## Image-Assisted Frontend Work

When `gpt-image-2` is available through the built-in `imagegen` route or an approved `ccswitch` CLI fallback, use it as a visual accelerator for:

- Visual direction sets
- Hero, empty-state, report-cover, thumbnail, or mockup assets
- Style variants for user selection
- Existing image edits when licensing and usage are acceptable

Do not treat generated images as implementation truth. Extract palette roles, spacing rhythm, surface rules, typography hierarchy, asset placement, responsive risks, and anti-patterns before coding.

Use `flow:frontend-design-boost:image` for the default local pass that rebuilds the prompt pack, plans jobs, and previews the selected runner command before any apply step.

Use `acceptance:frontend-design-boost:image` before claiming the image-assisted workflow is ready for live generation. It aggregates workflow preview, prompt-pack QA, asset intake, and installed-skill readiness without executing image generation.

Use `readiness:frontend-design-boost-skill` before relying on the installed user-level skill in a new session. It is read-only and reports stale files, missing workflow markers, and the approval-gated sync command.

Inspect `imagegen-handoff.json` when using the default built-in `image_gen` route from the `imagegen` skill. It does not require `OPENAI_API_KEY`; move selected outputs from `CODEX_HOME/generated_images` into the listed project-local asset paths before implementation.

Use `import:frontend-design-boost:imagegen-assets` after built-in generation to copy a selected output from `CODEX_HOME/generated_images` or a supplied `--source` PNG into the handoff `finalAssetPath`, validate dimensions, and write an import report before asset smoke.

Use `acceptance:frontend-design-boost:imagegen-assets` after built-in generation when one local command should chain import, asset smoke, image evidence, the read-only goal audit, asset intake, image decision, and implementation handoff for a selected handoff asset before implementation. It writes `imagegen-acceptance-report.json`, `goal-audit-report.json`, and `image-implementation-handoff-report.json`.

When running `audit:frontend-design-boost:goal` for the built-in route, pass `--live-evidence <image-evidence-report.json> --imagegen-acceptance <imagegen-acceptance-report.json> --implementation-handoff <image-implementation-handoff-report.json>` so completion depends on an external `CODEX_HOME/generated_images` source and an implementation-ready design extraction handoff rather than a repo-local placeholder PNG.

Use `acceptance:frontend-design-boost:ccswitch-assets` after an approved `ccswitch` live run has produced a project-local PNG and `runner-report.json`. It chains asset smoke, image evidence, asset intake, image decision, implementation handoff, and the read-only goal audit without calling the image API. Do not pass `--imagegen-acceptance` for this route.

Use `run:frontend-design-boost:image-job -- --report <runner-report.json>` when previewing or executing a selected job so the result can feed the later evidence gate.

Use `decision:frontend-design-boost:image` after asset intake to turn generated references into a decision matrix with acceptance, defer, and extraction guidance.

Use `evidence:frontend-design-boost:image` after an approved live `gpt-image-2` job produces a project-local PNG. It records the built-in handoff or runner report, route metadata, selected asset, PNG dimensions, and next gates before UI implementation.
For the built-in `imagegen` route, pass `--handoff <imagegen-handoff.json> --asset-id <asset-id> --asset <asset.png>` instead of a CLI runner report.

Use `handoff:frontend-design-boost:image` after image decision and live evidence exist. For built-in `imagegen`, include the acceptance report; for `ccswitch`, omit built-in acceptance and rely on the route-specific acceptance report. It writes `image-implementation-handoff-report.json` and `image-implementation-handoff.md` with the selected asset, route evidence, design token extraction prompts, do-not-copy rules, and HTML/React/Tailwind implementation checklist.

Use `intake:frontend-design-boost:assets` after generation or while assets are pending to produce a design extraction and implementation handoff report before coding from generated images.

Use `docs/frontend-design-boost/image-assisted-frontend-workflow.md` for the full workflow, prompt templates, reference intake, extraction checklist, generation jobs, asset-selection bridge, asset-consumption demo, asset handling, and `background=transparent` caution.

## Reference-Backed Defaults

- Operational dashboard: summary metrics, urgent actions, a data table or grid, one small trend block, and a state area on the first screen.
- Table-heavy surfaces: use accessible table patterns and semantics before inventing div-based substitutes.
- Disclosure-heavy copy: prefer semantic disclosure controls or APG-aligned patterns over custom click handlers.
- Research dashboards: use the local case library for chart-led stacked-card layouts, especially when pairing charts with event logs.
- QA gate proposals: use the local QA gate candidates doc before proposing Storybook, axe-core, `@axe-core/playwright`, or hosted visual-regression services.
- React/Next.js surfaces: use the local React performance and composition checks doc before adopting Vercel agent-skill rules wholesale.
- Debugging frontend failures: use the local frontend debug evidence bundle doc to combine server logs, browser console, network requests, screenshots, component catalogs, and action catalogs before asking an AI agent to fix UI behavior.
- Product Design plugin work: use `docs/frontend-design-boost/product-design-plugin-bridge.md` before assuming `@Product Design` is callable; preserve its brief gate, three-direction ideation, No Visual Target No Build rule, and `design-qa.md` handoff when falling back locally.
- Product Design task routing: use `brief:frontend-design-boost:product-design` before prototype-like work when you need a repo-local brief playback, route decision, No Visual Target gate, and evidence checklist without calling the plugin.
- Product Design ideation: use `ideate:frontend-design-boost:product-design` to scaffold or validate `product-design-ideation.md` when fallback work needs exactly three visual directions before implementation; keep build work blocked until generated images exist and the user selects one.
- Product Design design QA: use `design-qa:frontend-design-boost:product-design` to scaffold or validate `design-qa.md` when fallback work needs source-vs-implementation comparison evidence; a scaffold starts blocked until real visual comparison is captured.
- Product Design flow audit: use `audit:frontend-design-boost:product-design` to scaffold or validate `product-design-audit.md` when fallback work needs screenshot-backed UX/design/accessibility findings; a scaffold starts blocked until current-run screenshots are captured and inspected.
- External method research: if the design call depends on current public sources, gather them first instead of guessing.

## Token Preflight

Define these before building:

- Spacing scale
- Radius scale
- Typography hierarchy
- Color roles
- Surface and border treatment
- Motion behavior
- Focus style

Defaults:

- Keep card and panel radius at 8 px or less unless the repo already uses another value.
- Keep letter spacing at 0 unless the repo has an explicit typography token for a specific label style.
- Avoid single-hue pages that lose hierarchy.
- Use visible focus states and high-contrast body text.

## Hard Rejection Checks

Reject or revise any UI with:

- Blue or purple gradient abuse
- Cards inside cards
- Oversized rounded corners
- Text overflow
- Mobile overlap
- Empty or hollow hero sections
- Missing real visuals when the task needs visual evidence
- Monochrome theme with weak hierarchy
- Landing-page boilerplate used for product UI
- Dashboard density that is too sparse or too crowded
- Missing hover, focus, loading, empty, or error states

## State Requirements

For every meaningful user action or data surface, account for:

- Hover
- Focus
- Active or pressed
- Loading
- Empty
- Error
- Disabled

If a state is impossible or out of scope, say why in the handoff.

## Screenshot QA

Capture at least:

- Desktop: 1440 x 900
- Mobile: 390 x 844

Check:

- Page is not blank.
- First viewport communicates the actual product or task.
- Text stays inside containers.
- No content overlaps.
- Buttons and controls remain tappable on mobile.
- Tables or grids reflow without horizontal escape.
- Focus indicator is visible.
- Empty, loading, and error states are represented when relevant.

Use Playwright, a repo-native visual smoke command, or the current browser automation tool.
Report screenshot paths, viewport sizes, issues found, and fixes made.

## Handoff Requirements

Final handoff should include:

- Page type
- Component strategy
- Token choices
- References used
- Anti-patterns explicitly avoided
- Screenshots captured
- Desktop and mobile viewport sizes
- Overflow or overlap audit result
- Remaining risks

## Local Reference Artifacts

When this draft is used from `deckgen-local`, these companion files provide the fuller pack:

- `docs/frontend-design-boost/spec.md`
- `docs/frontend-design-boost/prompt.md`
- `docs/frontend-design-boost/reference-bank.md`
- `docs/frontend-design-boost/image-assisted-frontend-workflow.md`
- `docs/frontend-design-boost/qa-gate-candidates.md`
- `docs/frontend-design-boost/react-performance-composition-checks.md`
- `docs/frontend-design-boost/frontend-debug-evidence-bundle.md`
- `docs/frontend-design-boost/product-design-plugin-bridge.md`
- `scripts/frontend-design-boost-product-design-brief.mjs`
- `scripts/frontend-design-boost-product-design-ideate.mjs`
- `scripts/frontend-design-boost-product-design-qa.mjs`
- `scripts/frontend-design-boost-product-design-audit.mjs`
- `scripts/frontend-design-boost-image-assist.mjs`
- `scripts/frontend-design-boost-goal-audit.mjs`
- `scripts/frontend-design-boost-image-jobs-run.mjs`
- `scripts/frontend-design-boost-image-workflow.mjs`
- `scripts/frontend-design-boost-image-acceptance.mjs`
- `scripts/frontend-design-boost-image-decision.mjs`
- `scripts/frontend-design-boost-image-evidence.mjs`
- `scripts/frontend-design-boost-image-implementation-handoff.mjs`
- `scripts/frontend-design-boost-imagegen-import.mjs`
- `scripts/frontend-design-boost-imagegen-acceptance.mjs`
- `scripts/frontend-design-boost-ccswitch-acceptance.mjs`
- `scripts/frontend-design-boost-skill-readiness.mjs`
- `scripts/frontend-design-boost-product-design-readiness.mjs`
- `scripts/frontend-design-boost-skill-sync.mjs`
- `scripts/frontend-design-boost-asset-smoke.mjs`
- `scripts/frontend-design-boost-image-pack-qa.mjs`
- `scripts/frontend-design-boost-image-jobs-plan.mjs`
- `scripts/frontend-design-boost-asset-intake.mjs`
- `.tmp/frontend-design-boost/image-prompt-pack/asset-selection.json`
- `.tmp/frontend-design-boost/image-prompt-pack/asset-consumption-demo.html`
- `.tmp/frontend-design-boost/image-prompt-pack/imagegen-handoff.json`
- `.tmp/frontend-design-boost/image-prompt-pack/imagegen-import-report.json`
- `.tmp/frontend-design-boost/image-prompt-pack/imagegen-acceptance-report.json`
- `.tmp/frontend-design-boost/image-prompt-pack/ccswitch-acceptance-report.json`
- `.tmp/frontend-design-boost/image-prompt-pack/image-implementation-handoff-report.json`
- `.tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json`
- `fixtures/frontend-design-boost/image-assisted-brief.md`
- `fixtures/frontend-design-boost/reference-intake.md`
- `docs/frontend-design-boost/case-library/README.md`
- `docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md`
- `docs/frontend-design-boost/case-library/shadcn-dashboard-block.md`
- `docs/frontend-design-boost/case-library/cloudscape-service-dashboard.md`
- `docs/frontend-design-boost/case-library/shopify-resource-index.md`
- `docs/frontend-design-boost/case-library/elastic-eui-data-grid.md`
- `docs/frontend-design-boost/case-library/govuk-task-list-flow.md`
- `docs/frontend-design-boost/case-library/stripe-api-reference.md`
- `docs/frontend-design-boost/case-library/tremor-chart-dashboard.md`
- `docs/frontend-design-boost/case-library/ant-design-pro-admin.md`
- `docs/frontend-design-boost/case-library/mui-x-data-grid.md`
- `docs/frontend-design-boost/case-library/candidate-backlog.md`
- `docs/frontend-design-boost/companion-skills.md`
- `docs/frontend-design-boost/visual-qa-checklist.md`
- `fixtures/frontend-design-boost/saas-dashboard-brief.md`
- `fixtures/frontend-design-boost/dashboard-demo.html`
- `fixtures/frontend-design-boost/research-dashboard-brief.md`
- `fixtures/frontend-design-boost/research-dashboard-demo.html`
- `scripts/frontend-design-boost-fixture-qa.mjs`
