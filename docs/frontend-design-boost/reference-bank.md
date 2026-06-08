# Frontend Design Boost Reference Bank

Source links were checked on 2026-05-24. Case-library additions were last checked on 2026-05-26.

## Component and Token Systems

### shadcn/ui
Link: https://github.com/shadcn-ui/ui

Use for:

- Accessible common UI primitives
- Product UI controls
- Forms, dialogs, menus, tabs, and shells

Do not use for:

- Decorative one-off visuals
- Complex motion-heavy hero work

Codex note:

- Prefer this when the task needs a strong component baseline and predictable interaction states.

### Tailwind CSS
Link: https://github.com/tailwindlabs/tailwindcss

Use for:

- Token-driven layout and spacing
- Fast responsive refinement
- Consistent utility-level control

Do not use for:

- Styling that ignores the repo's existing design language

Codex note:

- Use Tailwind as the layout and token layer, not as a substitute for design decisions.

### Tailwind responsive design
Link: https://tailwindcss.com/docs/responsive-design

Use for:

- Mobile-first breakpoints
- Responsive spacing, grid, and visibility rules
- Turning a desktop dashboard into a controlled 390 px mobile layout

Do not use for:

- Hiding important information on mobile without a replacement path

Codex note:

- Start from the smallest required viewport, then add larger-screen refinements.

### shadcn/ui data table
Link: https://ui.shadcn.com/docs/components/data-table

Use for:

- Sortable or filterable product tables
- Row actions, column visibility, and selection patterns
- Table-heavy dashboards where the data surface is the product

Do not use for:

- Static marketing tables that only need simple HTML

Codex note:

- Treat shadcn's data table as a pattern reference; do not add TanStack or shadcn dependencies without approval.

### Material Design data tables
Link: https://m1.material.io/components/data-tables.html

Use for:

- Dense tabular comparison
- Row hierarchy, column alignment, and action placement
- Deciding when table density is helpful instead of decorative

Do not use for:

- Replacing repo-native table components that already solve the same problem

Codex note:

- Use Material's table guidance as a sanity check for density and readability, not as a visual skin to copy.

## Accessibility and Interaction References

### Radix UI accessibility
Link: https://www.radix-ui.com/primitives/docs/overview/accessibility

Use for:

- Accessible primitive behavior behind dialogs, menus, popovers, tabs, and select controls
- Focus management and keyboard interaction expectations
- Understanding the primitive layer used by many shadcn/ui components

Do not use for:

- Adding a new dependency when the repo already has equivalent accessible primitives

### WAI-ARIA APG disclosure pattern
Link: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/

Use for:

- Expand/collapse details
- Progressive disclosure for dense dashboards
- Keyboard behavior for custom disclosure controls

Do not use for:

- Custom widgets when native `details` and `summary` are sufficient

### WCAG 2.2 Focus Appearance
Link: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

Use for:

- Visible focus indicators
- Checking that focus rings are not removed or clipped
- Verifying keyboard users can track active controls

### WCAG 2.2 Target Size Minimum
Link: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Use for:

- Pointer target sizing in mobile and dense dashboard controls
- Icon-only buttons, table row actions, and compact toolbars

Codex note:

- Treat 24 x 24 CSS px or equivalent spacing as the minimum hard gate; go larger when the app style allows it.

## Visual and Motion References

### Magic UI
Link: https://github.com/magicuidesign/magicui

Use for:

- Polished marketing surfaces
- Motion-rich sections
- Higher-end visual composition when the page truly needs it

Do not use for:

- Dense dashboards that need restraint
- Utility tools that should stay quiet

### React Bits
Link: https://github.com/DavidHDev/react-bits

Use for:

- Reusable React interaction patterns
- Component inspiration for richer UI states
- Polished micro-interactions

Do not use for:

- Replacing core product structure

## Reverse Engineering and Prompting References

### screenshot-to-code
Link: https://github.com/abi/screenshot-to-code

Use for:

- Learning how screenshot-driven UI reconstruction works
- Understanding what visual detail matters in a reconstruction task

Do not use for:

- Runtime dependency injection
- Production UI generation without review

### 21st-dev Magic MCP
Link: https://github.com/21st-dev/magic-mcp

Use for:

- Skill-oriented visual generation workflows
- Prompt-driven UI assistance patterns

Do not use for:

- Runtime app dependency planning

### ui-ux-pro-max-skill
Link: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

Use for:

- Prompting patterns that push beyond generic UI output
- Learning how to ask for stronger composition and detail

Do not use for:

- Direct runtime integration

## Visual QA and Validation

### Playwright screenshots
Link: https://playwright.dev/docs/screenshots

Use for:

- Desktop and mobile screenshot capture
- Regression review
- Visual proof after layout fixes

### Playwright visual comparisons
Link: https://playwright.dev/docs/test-snapshots

Use for:

- Snapshot comparison workflows
- Repeatable visual regression checks

### QA gate candidates
Link: `docs/frontend-design-boost/qa-gate-candidates.md`

Use for:

- Evaluating Storybook, axe-core, and `@axe-core/playwright` as future local QA gates
- Deciding whether a target repo needs HTML fixture accessibility scans, Storybook component state tests, or Storybook accessibility checks
- Keeping QA-gate work local-first and service-free unless external services are explicitly approved

Do not use for:

- Installing Storybook, axe-core, or hosted visual-regression services by default
- Replacing desktop/mobile screenshots, keyboard review, or manual responsive checks

### React performance and composition checks
Link: `docs/frontend-design-boost/react-performance-composition-checks.md`

Source: `vercel-labs/agent-skills`

Use for:

- Reviewing React, Next.js, and React/Tailwind UI for performance risks after visual structure is chosen
- Applying local summaries of `react-best-practices`, `web-design-guidelines`, `composition-patterns`, and view-transition guidance
- Catching async waterfalls, broad imports, shared server state, serialization bloat, re-render pressure, boolean-prop sprawl, and missing accessibility states
- Keeping Vercel agent-skill ideas as reference-backed review prompts without installing the whole upstream skill collection

Do not use for:

- Wholesale installation of `vercel-labs/agent-skills`
- Rewriting repo-native component architecture without a target repo task and tests
- Adding view transitions or animation when no spatial relationship or user-state continuity is being communicated

### Frontend debug evidence bundle
Link: `docs/frontend-design-boost/frontend-debug-evidence-bundle.md`

Source: `vercel-labs/dev3000` and `vercel-labs/json-render`

Use for:

- Turning server logs, browser console messages, network requests, screenshots, and user interactions into one local timeline before asking an AI agent to debug frontend work
- Applying `dev3000`'s development-timeline idea without installing `d3k`
- Applying `json-render`'s component catalog and action catalog guardrails without introducing a renderer dependency
- Handing future agents a repeatable `frontend_debug_evidence_bundle/v1` artifact for vibe coding, visual QA, and bug reproduction

Do not use for:

- Wholesale installation of `vercel-labs/dev3000`, `d3k`, or `vercel-labs/json-render`
- Replacing Browser/Playwright screenshot QA, repo-native tests, or fixed Chrome guardrails
- Letting generated controls imply destructive or account-changing behavior without explicit approval

### Product Design plugin bridge
Link: `docs/frontend-design-boost/product-design-plugin-bridge.md`

Source: `openai-curated-remote/product-design`

Use for:

- Deciding when a future HTML/React/Tailwind task should call `@Product Design` directly
- Preserving Product Design's `get-context`, `ideate`, `prototype`, `url-to-code`, `image-to-code`, `audit`, and `design-qa` gates when the plugin is cached but not callable in the current session
- Applying Product Design's No Visual Target, No Build rule before new product, redesign, clone, or image-to-code work
- Running `npm.cmd run readiness:frontend-design-boost:product-design` to inspect the local plugin package without installing dependencies or writing saved context
- Running `npm.cmd run brief:frontend-design-boost:product-design` to create a Product Design task brief preflight before prototype-like work
- Running `npm.cmd run ideate:frontend-design-boost:product-design` to scaffold exactly three Product Design-style visual directions before implementation
- Running `npm.cmd run design-qa:frontend-design-boost:product-design` to scaffold or validate a Product Design design QA report before fallback handoff
- Running `npm.cmd run audit:frontend-design-boost:product-design` to scaffold or validate a Product Design flow audit report before UX/design/accessibility critique

Do not use for:

- Treating a cached plugin as callable when the current session does not expose `@Product Design`
- Copying Product Design plugin code or starter apps into this repo
- Running prototype bootstrap, dependency install, deployment, or Product Design user-context writes without explicit approval

### Product Design task brief preflight
Link: `scripts/frontend-design-boost-product-design-brief.mjs`

Use for:

- Turning a frontend brief plus optional `--visual-source` into a repo-local `product-design-task-brief.json` and `product-design-task-brief.md`
- Choosing the Product Design route after `get-context`: `ideate`, `prototype`, `url-to-code`, `image-to-code`, or `audit`
- Applying No Visual Target, No Build before implementation when a prototype, redesign, clone, or image-to-code task has only a written brief
- Listing evidence requirements such as desktop source screenshot, mobile source screenshot, selected visual direction, and `design-qa.md`
- Choosing the local fallback when `@Product Design` is cached but not callable in the current session

Do not use for:

- Calling Product Design, generating images, bootstrapping prototypes, installing dependencies, deploying, or saving Product Design context
- Replacing source capture, final implementation, or frontend-design-boost desktop/mobile screenshot QA
- Writing task artifacts outside repo-local `.tmp/frontend-design-boost/`

### Product Design ideation scaffold
Link: `scripts/frontend-design-boost-product-design-ideate.mjs`

Use for:

- Creating a repo-local `product-design-ideation.md` scaffold that preserves Product Design `ideate` rules
- Producing exactly three independent concept directions before implementation
- Turning a confirmed brief into Image Gen prompt seeds with target dimensions, hierarchy strategy, layout strategy, interaction model, and reference attachments
- Keeping the build gate blocked until three generated images exist and the user selects one visual target

Do not use for:

- Claiming visual ideation is complete without generated images
- Starting image-to-code, prototype, or repo UI implementation before selection
- Replacing Product Design `ideate` when the plugin is callable
- Treating prompt seeds as visual evidence

### Product Design design QA scaffold
Link: `scripts/frontend-design-boost-product-design-qa.mjs`

Use for:

- Creating a repo-local `design-qa.md` scaffold that follows the Product Design `design-qa` output contract
- Keeping fallback work blocked until source visual truth and implementation screenshots are compared at the same viewport and state
- Validating that `design-qa.md` includes source visual truth path, implementation screenshot path, viewport, state, full-view comparison evidence, focused region comparison evidence, findings, patches, and exact `final result`
- Forcing explicit passes over fonts and typography, spacing and layout rhythm, colors and visual tokens, image quality and asset fidelity, and copy/content

Do not use for:

- Claiming design QA passed before opening or capturing both source and implementation evidence
- Replacing Product Design `design-qa` when the plugin is callable
- Treating a blocked scaffold as implementation-ready handoff

### Product Design flow audit scaffold
Link: `scripts/frontend-design-boost-product-design-audit.mjs`

Use for:

- Creating a repo-local `product-design-audit.md` scaffold that follows Product Design `audit` expectations
- Planning evidence capture for product flows, journeys, dashboards, settings paths, onboarding, checkout, or other multi-step product experiences
- Keeping audit output blocked until every important step has a valid screenshot or named blocker
- Requiring a numbered step list, screenshot evidence, UX and design findings, accessibility risks, evidence limits, and general health per step

Do not use for:

- Claiming an audit is complete before current-run screenshots are captured and inspected
- Replacing Product Design `audit` when the plugin is callable
- Claiming full accessibility compliance from screenshots alone

### frontend design boost image prompt pack lab
Link: `scripts/frontend-design-boost-image-assist.mjs`

Use for:

- Turning a frontend brief into a deterministic gpt-image-2 prompt pack
- Injecting selected external source notes through `--reference-intake` after the user chooses references to learn from
- Emitting `image-generation-jobs.json` so the prompt pack includes a machine-readable approval-gated execution list with dry-run and executable commands
- Emitting `imagegen-handoff.json` and `imagegen-handoff.md` for the default built-in `image_gen` route that does not require `OPENAI_API_KEY`
- Importing selected built-in outputs from `CODEX_HOME/generated_images` into project-local asset paths with `import:frontend-design-boost:imagegen-assets`
- Emitting project-local asset paths, command snippets, browser-preview HTML, `asset-selection.json`, `asset-consumption-demo.html`, static QA reports, extraction notes, and screenshot QA checkpoints
- Bridging selected generated assets into concrete hero, empty-state, and visual-direction slots before implementation
- Making the built-in `imagegen` route repeatable across future HTML/React/Tailwind work, with `ccswitch` kept as an optional CLI fallback

Do not use for:

- Calling the image API automatically when the user only wants a preview
- Replacing actual image generation, review, or final implementation screenshot QA
- Writing outputs outside the repo-local `.tmp/frontend-design-boost/` and `output/imagegen/frontend-design-boost/` paths
- Treating `asset-consumption-demo.html` as production UI without adapting it to the target repo

### frontend design boost built-in imagegen handoff
Link: `imagegen-handoff.json`

Use for:

- Running the installed `imagegen` skill default built-in `image_gen` route from the prompt pack
- Keeping built-in generation separate from the CLI fallback that requires `OPENAI_API_KEY`
- Moving selected outputs from `CODEX_HOME/generated_images` into project-local asset paths before implementation
- Preserving the same asset smoke, asset intake, image decision, and screenshot QA gates after generation

Do not use for:

- Treating built-in image generation as UI approval
- Leaving project-referenced assets under `CODEX_HOME/generated_images`
- Skipping the evidence or asset smoke gates after moving final assets

### frontend design boost imagegen import
Link: `scripts/frontend-design-boost-imagegen-import.mjs`

Use for:

- Copying a selected built-in `imagegen` PNG from `CODEX_HOME/generated_images` or a supplied `--source` path into the handoff `finalAssetPath`
- Validating PNG dimensions before the asset becomes project-local implementation input
- Writing `imagegen-import-report.json` and `imagegen-import.md` as the handoff between built-in generation and asset smoke

Do not use for:

- Calling image generation APIs
- Writing outside the current repo
- Treating the imported image as UI approval without asset intake, image decision, and screenshot QA

### frontend design boost imagegen acceptance
Link: `scripts/frontend-design-boost-imagegen-acceptance.mjs`

Use for:

- Running `acceptance:frontend-design-boost:imagegen-assets` after built-in `imagegen` produces a selected PNG
- Chaining built-in output import, asset smoke, and image evidence for one selected handoff asset
- Writing `imagegen-acceptance-report.json`, `imagegen-acceptance.md`, `asset-intake-report.json`, `image-decision-report.json`, and `image-implementation-handoff-report.json` before UI implementation
- Writing `goal-audit-report.json` after the implementation handoff exists so provenance, installed-skill blockers, and design-extraction readiness are visible in the same closeout packet
- Keeping desktop and mobile screenshot QA visible as the next required gate
- Feeding `audit:frontend-design-boost:goal -- --live-evidence <image-evidence-report.json> --imagegen-acceptance <imagegen-acceptance-report.json> --implementation-handoff <image-implementation-handoff-report.json>` so built-in imagegen provenance and implementation handoff readiness are checked before goal completion
- Producing the implementation handoff so HTML/React/Tailwind coding can start from selected asset evidence, design token extraction prompts, and do-not-copy rules

Do not use for:

- Calling image generation APIs
- Replacing visual review, asset intake, image decision, or implementation screenshot QA
- Treating the built-in `imagegen` output as production UI approval
- Treating repo-local placeholder PNGs as equivalent to an external `CODEX_HOME/generated_images` source

### frontend design boost ccswitch acceptance
Link: `scripts/frontend-design-boost-ccswitch-acceptance.mjs`

Use for:

- Running `acceptance:frontend-design-boost:ccswitch-assets` after an approved `ccswitch` live run produces a project-local PNG and `runner-report.json`
- Chaining asset smoke, image evidence, asset intake, image decision, implementation handoff, and read-only goal audit without calling the image API again
- Writing `ccswitch-acceptance-report.json`, `ccswitch-acceptance.md`, `asset-smoke-report.json`, `image-evidence-report.json`, `asset-intake-report.json`, `image-decision-report.json`, `image-implementation-handoff-report.json`, and `goal-audit-report.json`
- Feeding `audit:frontend-design-boost:goal -- --live-evidence <image-evidence-report.json> --implementation-handoff <image-implementation-handoff-report.json>` without the built-in-only `--imagegen-acceptance` gate

Do not use for:

- Executing live image generation
- Storing `ccswitch` provider keys or bearer tokens in repo artifacts
- Treating a successful generated bitmap as proof of responsive layout, interaction states, or accessibility

### frontend design boost reference intake fixture
Link: `fixtures/frontend-design-boost/reference-intake.md`

Use for:

- Capturing selected external references before they influence `gpt-image-2` prompts
- Separating what to extract from what must not be copied
- Making source-backed visual direction reusable without installing dependencies

Do not use for:

- Approving copied screenshots, brand assets, source code, or proprietary product flows
- Treating an inspiration source as implementation truth

### frontend design boost image jobs plan
Link: `scripts/frontend-design-boost-image-jobs-plan.mjs`

Use for:

- Reading `image-generation-jobs.json` before real image generation
- Reporting missing environment gates such as `OPENAI_API_KEY`
- Separating dry-run commands from executable commands without invoking the image API

Do not use for:

- Bypassing the `imagegen` skill mode rules
- Running live generation without explicit user approval
- Replacing asset smoke or screenshot QA

### frontend design boost image job runner
Link: `scripts/frontend-design-boost-image-jobs-run.mjs`

Use for:

- Previewing a selected `image-generation-jobs.json` command before any apply step
- Writing a repo-local runner report with `--report <runner-report.json>` for the later image evidence gate
- Executing exactly one approved `gpt-image-2` job only after explicit approval and environment verification

Do not use for:

- Running all jobs by default
- Skipping the evidence, asset smoke, asset intake, decision, or screenshot QA gates
- Writing reports outside the repo

### frontend design boost image workflow orchestrator
Link: `scripts/frontend-design-boost-image-workflow.mjs`

Use for:

- Running the default local gpt-image-2 workflow preview in one command
- Rebuilding the prompt pack, planning jobs, previewing the selected runner command, and writing asset intake notes
- Keeping `flow:frontend-design-boost:image` as the no-execution default before any `--apply` step

Do not use for:

- Treating workflow preview as proof that live image generation has succeeded
- Skipping prompt-pack QA, installed-skill readiness, or asset smoke after generation

### frontend design boost image workflow acceptance
Link: `scripts/frontend-design-boost-image-acceptance.mjs`

Use for:

- Aggregating workflow preview, prompt-pack QA, asset intake, and installed-skill readiness before live generation
- Running `acceptance:frontend-design-boost:image` as the local acceptance gate for image-assisted frontend work
- Reporting default-route blockers such as stale installed skill files, plus optional CLI fallback blockers such as missing `OPENAI_API_KEY`

Do not use for:

- Executing live gpt-image-2 jobs
- Writing the installed skill copy
- Claiming final UI quality without desktop and mobile screenshot QA

### frontend design boost goal audit
Link: `scripts/frontend-design-boost-goal-audit.mjs`

Use for:

- Auditing whether the repo-local image workflow, installed skill, and live gpt-image-2 gates are enough to claim the broader goal
- Running `audit:frontend-design-boost:goal` when a continuation asks what remains
- Keeping `goalComplete` false until repo artifacts, installed-skill sync, image-generation readiness, live generation evidence, built-in imagegen provenance, and the image implementation handoff are all present

Do not use for:

- Bypassing explicit approval for AppData skill sync or live image generation
- Treating a narrow script pass as proof that the complete frontend workflow has shipped

### frontend design boost asset intake report
Link: `scripts/frontend-design-boost-asset-intake.mjs`

Use for:

- Turning generated or pending gpt-image assets into design extraction and implementation handoff notes
- Writing `asset-intake-report.json` and `asset-intake.md` before coding from generated references
- Separating accepted design intent from details that must be rebuilt in accessible, responsive code

Do not use for:

- Treating generated images as implementation truth
- Skipping `smoke:frontend-design-boost:assets` after image files are generated

### frontend design boost image decision report
Link: `scripts/frontend-design-boost-image-decision.mjs`

Use for:

- Turning asset intake into an acceptance matrix with scores, rationale, and extraction prompts
- Running `decision:frontend-design-boost:image` after asset intake and before coding from generated references
- Separating candidate-for-acceptance assets from deferred assets before implementation
- Creating a durable handoff for the selected design direction, risks, and screenshot QA expectations

Do not use for:

- Replacing the acceptance preview or asset intake steps
- Treating a score as a substitute for visual judgment

### frontend design boost image implementation handoff
Link: `scripts/frontend-design-boost-image-implementation-handoff.mjs`

Use for:

- Running `handoff:frontend-design-boost:image` after image decision and live evidence exist; include built-in acceptance only for the built-in imagegen route
- Consolidating the selected `gpt-image-2` asset, route evidence, provenance status, design token extraction prompts, and HTML/React/Tailwind implementation checklist
- Writing `image-implementation-handoff-report.json` and `image-implementation-handoff.md` before coding from the accepted generated reference
- Keeping do-not-copy rules visible so generated UI text, fake data, brand marks, and inaccessible spacing do not leak into implementation

Do not use for:

- Calling image generation APIs
- Replacing visual judgment, asset smoke, image decision, or screenshot QA
- Claiming final UI quality before desktop and mobile screenshot QA pass

### frontend design boost image evidence report
Link: `scripts/frontend-design-boost-image-evidence.mjs`

Use for:

- Recording local evidence after an approved live `gpt-image-2` job has produced a project-local PNG
- Running `evidence:frontend-design-boost:image` to create `image-evidence-report.json` and `image-evidence.md`
- Validating either a CLI runner report with `--runner-report` or a built-in imagegen handoff with `--handoff <imagegen-handoff.json> --asset-id <asset-id>`
- Validating that the selected job or handoff asset, route metadata, output path, and PNG dimensions line up before implementation
- Feeding `audit:frontend-design-boost:goal -- --live-evidence <image-evidence-report.json>` so the goal audit can distinguish live generation proof from a dry-run preview
- Keeping the next gates explicit: asset smoke, asset intake, image decision, and desktop and mobile screenshot QA

Do not use for:

- Calling the image API
- Approving UI quality without visual review and screenshot QA
- Treating an image file as proof that accessibility, responsive layout, or data behavior is correct

## Local Repo References

### Companion Codex skills
Link: `docs/frontend-design-boost/companion-skills.md`

Use for:

- Deciding when to combine this pack with `brainstorming`, `imagegen`, `playwright`, `requesting-code-review`, `verification-before-completion`, `test-driven-development`, or `prompt-patterns`
- Keeping this pack focused on frontend quality instead of duplicating every related workflow

### deckgen-local HTML template lab
Link: `docs/superpowers/specs/2026-05-14-html-anything-local-template-lab-design.md`

Use for:

- Understanding how `html-anything` stays a template/export reference
- Reusing a local lab instead of importing a runtime dependency

### deckgen-local HTML visual smoke
Link: `scripts/html-visual-smoke.mjs`

Use for:

- Desktop and mobile screenshot QA
- Overflow and broken-image checks
- A practical validation path for generated HTML

### deckgen-local frontend design boost fixture QA
Link: `scripts/frontend-design-boost-fixture-qa.mjs`

Use for:

- Standalone validation of `fixtures/frontend-design-boost/dashboard-demo.html`
- Desktop and mobile screenshots for the pack demo
- Checking panel radius, interaction states, and overflow in a non-deck HTML surface
- Repo command: `npm.cmd run qa:frontend-design-boost`

### deckgen-local frontend design boost research fixture QA
Link: `scripts/frontend-design-boost-fixture-qa.mjs`

Use for:

- Screenshot QA for `fixtures/frontend-design-boost/research-dashboard-demo.html`
- Checking chart-led research dashboards with stacked cards and threat/drawdown/meaning logging
- Repo command: `npm.cmd run qa:frontend-design-boost:research`

### deckgen-local frontend design boost skill drift check
Link: `scripts/frontend-design-boost-skill-drift.mjs`

Use for:

- Verifying the installed `$frontend-design-boost` skill matches the repo draft
- Catching cases where repo docs were updated but `$CODEX_HOME/skills/frontend-design-boost` still has stale routing
- Repo command: `npm.cmd run check:frontend-design-boost-skill`

### deckgen-local frontend design boost skill sync helper
Link: `scripts/frontend-design-boost-skill-sync.mjs`

Use for:

- Preparing or applying a safe sync from the repo skill draft into the installed Codex skill
- Dry-running the sync plan before touching `$CODEX_HOME/skills/frontend-design-boost`
- Keeping the installed skill aligned with the repo-local bridge artifacts without guessing at the file set

Do not use for:

- Blindly overwriting installed skill files without review
- Skipping the drift check

### deckgen-local frontend design boost asset smoke gate
Link: `scripts/frontend-design-boost-asset-smoke.mjs`

Use for:

- Validating generated PNG assets referenced by `asset-selection.json`
- Checking that project-local asset paths exist, decode as PNGs, and match the declared sizes
- Proving the generated gpt-image outputs are fit for HTML, React, and Tailwind consumption before implementation wires them into the UI

Do not use for:

- Skipping the prompt-pack or selection-manifest steps
- Replacing screenshot QA for the implemented UI

### frontend design boost case library
Link: `docs/frontend-design-boost/case-library/README.md`

Use for:

- Local pattern notes from reviewed external and repo-native frontend surfaces
- Turning a visual reference into information architecture, component, token, responsive, and QA guidance
- Reusing layout logic without copying external assets or data

### frontend design boost candidate backlog
Link: `docs/frontend-design-boost/case-library/candidate-backlog.md`

Use for:

- Selecting the next external design reference to promote into a full local case note
- Keeping source-backed candidates separate from verified local case studies
- Avoiding unreviewed copying before the user provides acceptance criteria

### frontend design boost integration candidate shortlist
Link: `docs/frontend-design-boost/integration-candidate-shortlist.md`

Use for:

- Reviewing well-known external design systems, UI libraries, chart tools, QA tools, AI-assisted UI tools, and inspiration sources before deciding how to integrate them
- Choosing whether a candidate should become reference-only guidance, a full case note, a synthetic fixture, a QA gate, or a runtime dependency proposal
- Preventing dependency creep while still keeping the local skill informed by effective public frontend systems

Do not use for:

- Approving dependency installation by itself
- Copying external screenshots, brand assets, app flows, or source code

### frontend design boost integration selection rubric
Link: `docs/frontend-design-boost/integration-selection-rubric.md`

Use for:

- Scoring candidate sources before deciding whether they become case notes, fixtures, QA gates, or runtime dependency proposals
- Keeping integration decisions explicit, repeatable, and reviewable
- Mapping source quality to the lightest valid local artifact

Do not use for:

- Automatically approving a dependency or visual system
- Replacing actual source review and repo-native verification

### frontend design boost image assisted frontend workflow
Link: `docs/frontend-design-boost/image-assisted-frontend-workflow.md`

Use for:

- Deciding when `gpt-image-2` through the built-in `imagegen` route or approved `ccswitch` fallback should produce visual direction references or project-bound bitmap assets
- Converting generated images into explicit tokens, component intent, layout rhythm, and screenshot QA requirements
- Passing selected external references through `--reference-intake` so prompt packs stay source-aware and non-copying
- Reviewing `image-generation-jobs.json` before running the generated image commands
- Keeping image generation scoped to frontend design acceleration instead of layout correctness, data accuracy, accessibility, or runtime behavior

Do not use for:

- Skipping implementation review, responsive checks, interaction states, or accessibility gates
- Leaving final HTML or React assets referenced from temporary Codex cache paths
- Assuming model-specific parameters such as `background=transparent` without checking current image-model docs and the installed `imagegen` skill

### OCMacro Trump dashboard case
Link: `docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md`

Use for:

- Macro, market, policy, and research dashboards that need a chart-led first screen
- Pairing quantitative charts with narrative event logs
- Preserving analytical hierarchy on mobile without switching to landing-page composition
- Learning from a controlled nav overflow and offscreen export-SVG QA caveat

### shadcn dashboard block case
Link: `docs/frontend-design-boost/case-library/shadcn-dashboard-block.md`

Use for:

- React/Tailwind app shells with sidebar, header, summary cards, chart surface, and data table
- Deciding component ownership before generating dashboard code
- Avoiding copy/paste dependency drift when borrowing from public blocks

### Cloudscape service dashboard case
Link: `docs/frontend-design-boost/case-library/cloudscape-service-dashboard.md`

Use for:

- Enterprise service consoles that need dashboard items plus a resource collection
- Property filters, saved filter sets, table and card views, and collection preferences
- Choosing when a dense dashboard should be static, configurable, or resource-management-led

Do not use for:

- Copying AWS console visuals or adding Cloudscape dependencies without approval
- Lightweight dashboards where a simple table or small card list is enough

### Shopify resource index case
Link: `docs/frontend-design-boost/case-library/shopify-resource-index.md`

Use for:

- Merchant/admin resource pages with saved views and bulk actions
- Choosing between resource list and index table bodies
- Filter-heavy list management with paired details layouts

Do not use for:

- Copying Polaris visuals or code without approval
- Small lists that do not need index behavior

### Elastic EUI data grid case
Link: `docs/frontend-design-boost/case-library/elastic-eui-data-grid.md`

Use for:

- Dense multi-column operational grids
- Schema-driven column setup, control columns, and toolbar actions
- Truncation, popovers, and mobile fallback decisions

Do not use for:

- Sparse tables that do not need data-grid behavior
- Copying Elastic visuals or code without approval

### GOV.UK task list case
Link: `docs/frontend-design-boost/case-library/govuk-task-list-flow.md`

Use for:

- Long transactional flows with task status scanning
- One-question pages with Back link, Continue, and accessible validation
- Onboarding, compliance, application, and review flows that should stay plain and content-first

Do not use for:

- Dashboards, report pages, or visual timelines
- Copying GOV.UK branding or service copy

### Stripe API reference case
Link: `docs/frontend-design-boost/case-library/stripe-api-reference.md`

Use for:

- API, SDK, CLI, and plugin reference pages
- Endpoint navigation, object hierarchy, parameters, returns, and code examples
- Copy actions and Copy for LLM style context export

Do not use for:

- Non-technical product pages
- Copying Stripe visuals, copy, or code snippets

### Tremor chart dashboard case
Link: `docs/frontend-design-boost/case-library/tremor-chart-dashboard.md`

Use for:

- Chart-led analytics dashboards and KPI cards
- Choosing line, area, bar, donut, bar list, or tracker-like chart treatments
- Textual chart summaries, chart states, and mobile chart readability

Do not use for:

- Adding Tremor, Recharts, Radix UI, or Tailwind dependencies without approval
- Replacing information architecture with decorative chart cards

### Ant Design Pro admin case
Link: `docs/frontend-design-boost/case-library/ant-design-pro-admin.md`

Use for:

- Enterprise admin pages with query forms, dense tables, batch actions, drawer/modal editing, and validation-heavy workflows
- Deciding when Ant Design / ProComponents should stay as pattern references versus becoming a dependency proposal
- React CRUD screens where editable records, saved search state, and table action hierarchy matter

Do not use for:

- Copying Ant Design visuals into a repo with an incompatible design system
- Adding Ant Design or ProComponents dependencies without explicit approval
- Treating a ProTable-like abstraction as a substitute for accessibility and mobile QA

### MUI X data grid case
Link: `docs/frontend-design-boost/case-library/mui-x-data-grid.md`

Use for:

- React data-grid pages that need sorting, filtering, pagination, editing, selection, virtualization, and column controls
- Deciding whether a target can use a plain table, headless table, or batteries-included grid
- Checking license tier before proposing MUI X Community, Pro, or Premium features

Do not use for:

- Non-React projects
- Static tables that do not need grid interaction
- Adding MUI X dependencies without explicit approval and license review

### Research dashboard demo fixture
Link: `fixtures/frontend-design-boost/research-dashboard-demo.html`

Use for:

- A local, runnable dashboard that mirrors the OCMacro case without copying assets or data
- Layout validation for the same chart-first, event-log, mobile-hierarchy pattern
- Running `npm.cmd run qa:frontend-design-boost:research`

## Recommended Use Order

1. Start with shadcn/ui and Tailwind for structure and tokens.
2. Add Magic UI or React Bits only when the task needs richer presentation.
3. Check the local case library when the user provides or asks for a dashboard reference.
4. Use screenshot-to-code, Magic MCP, or ui-ux-pro-max-skill as reference fuel, not runtime plumbing.
5. Finish with Playwright screenshots and local visual smoke.
