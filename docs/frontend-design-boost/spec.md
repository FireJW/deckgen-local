# Codex Frontend Design Boost Pack Spec

## Purpose

This pack improves how Codex plans and produces HTML, web, React, and Tailwind user interfaces.
It does not change Codex Desktop or Codex App UI.
It turns frontend design into a repeatable preflight, generation, review, and screenshot-verification flow.

## Scope

This pack is for:

- HTML pages
- Product UI
- Operational dashboards
- Marketing pages when they are actually requested
- React and Tailwind work
- Single-screen and multi-screen frontend tasks

It is not for:

- Codex Desktop UI
- Agent workbench UI
- Session management UI
- Runtime dependencies for external apps
- Generic "make it pretty" advice

## Operating Model

Codex should follow this sequence before building a frontend:

1. Identify the page type.
2. Identify the audience and action.
3. Decide the information density.
4. Choose a design system or component strategy.
5. Define tokens before layout.
6. Collect visual references.
7. Draft the UI structure and states.
8. Build with the smallest safe set of components.
9. Run visual QA on desktop and mobile.
10. Fix overflow, overlap, and state gaps.
11. Recheck screenshots before handoff.

## Source-Backed Defaults

Use the reference bank as method input, not as a dependency shopping list.

- Operational dashboards default to a summary metric strip, prioritized actions, a table or grid, one trend block, and explicit loading/empty/error states.
- Data-heavy product UI should start from table semantics and row actions before falling back to generic cards.
- Chart-led research dashboards should check the local case library for stacked analytical cards, event logs, and mobile hierarchy patterns.
- Dense pages should use progressive disclosure for details that slow scanning, while keeping the decision surface visible.
- Custom disclosure, tabs, menus, and dialogs should follow accessible primitive or WAI-ARIA APG behavior.
- Mobile work starts from the 390 x 844 check, then scales up to 1440 x 900 and intermediate widths when the layout changes.
- Focus appearance and pointer target size are part of visual QA, not optional accessibility polish.

## Page Type Decision

Use the page type to control layout, density, and visual language.

- Operational dashboard: dense, quiet, utility-first, minimal decoration.
- Product UI: task-first, data-rich, predictable controls, clear states.
- Editorial or article page: strong hierarchy, readable rhythm, image-aware.
- Landing page: only when the user asked for a landing page. Keep hero real, not empty.
- Social card or carousel: single-message composition, high contrast, short copy.
- Data report: table-aware, chart-aware, evidence-oriented.
- Mixed app shell: stable navigation, obvious secondary state, no layout drift.

## Design Flow

### 1. Classify the task

Determine:

- What the user wants to do
- What the page must prove
- Whether the page is meant to inform, compare, convert, operate, or browse
- Whether the content is sparse or dense

### 2. Choose the visual strategy

Pick one primary strategy:

- Component-system-led when the interface is mostly controls and data
- Editorial-led when reading and narrative structure matter
- Visual-led when imagery, motion, or product screenshots are the point
- Hybrid only when the task truly needs both

### 3. Define tokens first

Set these before layout:

- Spacing scale
- Radius scale
- Typography hierarchy
- Color roles
- Surface depth
- Border weight
- Motion behavior

Default guidance:

- Keep radius small, usually 0 to 8 px.
- Use one clear accent, not a rainbow of accents.
- Avoid single-hue monotony unless the source brand requires it.
- Use real contrast for text, borders, and state changes.

### 4. Choose component strategy

Prefer the smallest set that fits the repo:

- shadcn/ui for common control patterns and accessible primitives
- Tailwind CSS for layout, spacing, and token-driven styling
- Magic UI for polished motion or polished marketing components when appropriate
- React Bits for reusable React interaction patterns or component inspiration
- screenshot-to-code as a reverse-engineering reference, not as a style substitute
- Magic MCP and similar skill packs as idea sources, not as runtime dependencies

Do not add a component library just because it looks trendy.
Use existing project conventions first.

### 5. Collect reference input

Every nontrivial page should have at least one visual reference source:

- A product screenshot
- A real app pattern
- A component library example
- A design system token set
- A prior deckgen output that already works well

If a task lacks visual reference, Codex should say so and use a conservative layout.

### 6. Build the UI

Codex should:

- Start with information architecture
- Keep primary actions obvious
- Make the first viewport truthful
- Respect data density
- Keep text inside its container
- Keep cards and sections distinct
- Use real spacing and hierarchy instead of decorative fluff

### 7. Cover states

Every meaningful interaction needs:

- Hover
- Focus
- Active or pressed
- Loading
- Empty
- Error
- Disabled

### 8. Verify visually

Use screenshot-based QA as a required finish step.

- Desktop screenshot
- Mobile screenshot
- Optional tablet screenshot when layout changes across mid-size screens
- Compare the result against the intended page type
- Re-run after every layout fix

## Hard Rejection Rules

Treat these as block-level problems, not style preferences:

- Blue or purple gradient abuse
- Cards inside cards
- Oversized corner radius
- Text overflow
- Mobile overlap
- Empty hero sections
- No real visual assets when the task calls for visuals
- Monochrome pages that lose hierarchy
- Landing-page boilerplate used for product or dashboard tasks
- Dashboard density that is too low or too high
- Missing hover, focus, empty, loading, or error states

## Verification Standard

The output is acceptable only if:

- The page type is explicit
- The design strategy is explicit
- The chosen library or component strategy is explicit
- Visual references are named
- The anti-pattern checks are passed
- Desktop and mobile screenshots are reviewed
- No text overflow or overlap is visible
- The page still works with realistic content length
- States are present where the UI needs them

## Repo Fit

This pack should live beside deckgen-local's existing HTML lab and visual-smoke tooling.
It should stay docs-first and fixture-driven.
`html-anything` remains a template/export reference, not a production runtime dependency.
For the standalone demo fixture, use `scripts/frontend-design-boost-fixture-qa.mjs` and the `qa:frontend-design-boost` npm script.
