# Frontend Design Boost QA Gate Candidates

Use this proposal when a frontend task needs stronger repeatable validation than static checklist review and one-off screenshots.

This is not an install plan. It is a source-backed local QA gate proposal for future HTML, React, Tailwind, dashboard, and component work.

Source anchors:

- Storybook interaction testing: https://storybook.js.org/docs/writing-tests/interaction-testing
- Storybook accessibility testing: https://storybook.js.org/docs/writing-tests/accessibility-testing
- axe-core: https://github.com/dequelabs/axe-core
- axe-core npm package: https://www.npmjs.com/package/axe-core
- Playwright accessibility testing with AxeBuilder: https://playwright.dev/docs/accessibility-testing

## Current Baseline

The pack already has local screenshot QA:

- `npm.cmd run qa:frontend-design-boost`
- `npm.cmd run qa:frontend-design-boost:research`
- `scripts/frontend-design-boost-fixture-qa.mjs`

Keep these as the default gate for standalone HTML fixtures.

## Candidate 1: HTML Fixture Accessibility Gate

Best first implementation for this repo if dependency approval is granted later.

Proposed shape:

- Use Playwright to open a local HTML fixture.
- Use `@axe-core/playwright` or equivalent AxeBuilder integration to scan the rendered page.
- Run desktop and mobile viewports separately.
- Fail on critical and serious accessibility violations.
- Write a JSON report under `.tmp/frontend-design-boost/`.
- Keep screenshots in the same run folder for visual triage.

Why this is attractive:

- It fits the current fixture model.
- It does not require Storybook.
- It improves repeatable validation for generated HTML surfaces.
- It catches common semantic, contrast, name, role, and ARIA mistakes before handoff.

Do not use it as a full accessibility signoff. Automated scans miss keyboard traps, unclear task flow, content quality, and many responsive problems.

## Candidate 2: Storybook Component State Gate

Use when the target repo has repeated React components, shared controls, or a design system surface.

Proposed shape:

- Add stories for important component states: default, hover-equivalent, focus, loading, empty, error, disabled, selected, and long-content.
- Use Storybook interaction tests for state transitions and simple flows.
- Run Storybook tests locally or in CI only after the target repo accepts the dependency and command shape.
- Keep screenshots or story URLs in the handoff for review.

Why this is useful:

- It turns state requirements into durable examples.
- It makes regressions visible before page-level QA.
- It is better for reusable React UI than one-off HTML fixtures.

## Candidate 3: Storybook Accessibility Addon Gate

Use only when Storybook already exists or is approved for the target repo.

Proposed shape:

- Add the Storybook accessibility addon or equivalent axe-based check.
- Scan each relevant story state.
- Require story authors to fix violations or document justified exceptions.
- Keep manual keyboard and visual review as separate gates.

This is not the first choice for `deckgen-local` standalone HTML fixtures because it adds project structure before the pack needs it.

## No External Service

Do not use Chromatic, Percy, or other hosted visual QA services without explicit approval.

Local-first order:

1. Existing Playwright screenshot smoke.
2. HTML fixture accessibility gate with `@axe-core/playwright`.
3. Storybook component state tests when React component reuse justifies it.
4. Hosted visual regression only after a repo explicitly accepts the service.

## Do Not Install Yet

Do not install Storybook, `axe-core`, `@axe-core/playwright`, or Storybook addons from this proposal alone.

Before any dependency change, write a target-repo proposal that includes:

- Why the existing local smoke gate is insufficient
- Exact packages and versions
- New script names
- Expected report paths
- CI or local-only behavior
- Failure threshold
- Maintenance owner
- Rollback plan

## Acceptance Gate

Before promoting any candidate into a real command:

- It must run locally without an external service.
- It must work on at least one checked-in fixture.
- It must produce machine-readable output.
- It must fail on a seeded violation.
- It must not replace desktop and mobile screenshots.
- It must document false-positive handling.
- It must be covered by tests.
- It must not install dependencies without explicit approval.

## Manual Checks Still Required

Automated gates do not replace:

- Keyboard tab order and focus visibility
- Pointer target size review
- Mobile overflow and overlap checks
- Real data readability
- Empty, loading, error, and disabled states
- Chart summaries and table fallback behavior
- User task clarity

Use automated QA to catch repeatable defects. Use human review to decide whether the interface actually works.
