# Frontend Design Boost Companion Skills

This pack should not become a giant all-purpose frontend meta-skill.
It should route to existing Codex skills when those skills already own a workflow.

## Use With These Skills

### brainstorming

Use before creative frontend implementation, especially when the task is ambiguous, design-heavy, or changes behavior.

Good triggers:

- New product screen
- New dashboard
- New landing page
- New visual direction
- Major UI revision

Role:

- Clarify audience, workflow, density, page type, and design direction before implementation.
- If the user has already approved a concrete design direction, keep the brainstorming pass short and focused on remaining unknowns.

### imagegen

Use when a webpage needs project-bound bitmap visuals.

Good triggers:

- Hero image
- Product image
- Venue or object image
- Illustration
- Texture
- Card background
- Transparent cutout

Role:

- Produce real bitmap assets when HTML/CSS/SVG placeholders would weaken the page.

Do not use it for:

- Simple icons
- Existing SVG systems
- Native CSS shapes
- Deterministic diagrams

### Product Design plugin bridge

Use when a product UI, prototype, redesign, URL-to-code, image-to-code, audit, or design QA task would benefit from `@Product Design`.

Good triggers:

- New product idea that needs visual directions before build
- Redesign or clone from a URL, screenshot, image, Figma frame, or mockup
- Product-flow UX/design/accessibility audit
- Prototype-like work that needs source-vs-implementation comparison

Role:

- Use `@Product Design` directly when the current session exposes it.
- If it is cached but not callable, run `npm.cmd run readiness:frontend-design-boost:product-design` and follow `docs/frontend-design-boost/product-design-plugin-bridge.md`.
- Before prototype-like implementation, run `npm.cmd run brief:frontend-design-boost:product-design -- --brief <brief.md>` to produce a Product Design task brief preflight with the route decision, No Visual Target gate, and evidence checklist.
- When three visual directions are required but Product Design is not callable, run `npm.cmd run ideate:frontend-design-boost:product-design` to scaffold or validate `product-design-ideation.md`; keep build work blocked until generated images exist and the user selects one.
- When source-vs-implementation comparison is required but Product Design is not callable, run `npm.cmd run design-qa:frontend-design-boost:product-design` to scaffold or validate `design-qa.md`; keep the report blocked until real comparison evidence exists.
- When UX/design/accessibility critique of a product flow is required but Product Design is not callable, run `npm.cmd run audit:frontend-design-boost:product-design` to scaffold or validate `product-design-audit.md`; keep the report blocked until current-run screenshots and step notes exist.
- Preserve its brief gate, three-direction ideation, No Visual Target, No Build rule, and `design-qa.md` handoff in the local fallback.

Do not use it for:

- Ordinary repo-native UI edits that already have a chosen target and do not need product ideation or prototype QA
- Installing Product Design dependencies, bootstrapping prototypes, deploying, or writing Product Design saved context without explicit approval

### playwright

Use when browser automation, screenshots, interactions, or UI flow debugging are required.

Good triggers:

- Desktop screenshot
- Mobile screenshot
- Local page verification
- Form interaction
- DOM snapshot
- Visual QA before completion

Role:

- Capture evidence and inspect real rendered behavior.

### deep-research-dag

Use when frontend direction depends on current external references or several source families.

Good triggers:

- Comparing dashboard, table, or design-system patterns from the web
- Resolving conflicting design or accessibility guidance
- Updating the reference bank from public sources
- Reviewing multiple repositories before choosing a component strategy

Role:

- Gather and reconcile source-backed UI, accessibility, and QA methods before the design direction is locked.

### verification-before-completion

Use before claiming the frontend work is complete.

Good triggers:

- Final handoff
- Before commit
- Before PR
- Before saying screenshots or tests passed

Role:

- Require fresh evidence before success claims.

### requesting-code-review

Use after substantial frontend implementation or before merge, subject to the active session's subagent/delegation rules.

Good triggers:

- Multi-file frontend change
- New design system slice
- New page
- Major responsive refactor
- Before merging a branch

Role:

- Catch functional, visual, accessibility, and maintainability issues before handoff.
- If reviewer subagents are not allowed in the current session, run the same review locally and report that limitation.

### test-driven-development

Use when the frontend change includes behavior or logic.

Good triggers:

- New state reducer
- Validation behavior
- Component interaction logic
- Routing behavior
- Data transformation for UI

Role:

- Prove behavior with tests before implementation.

### prompt-patterns

Use when the output should become a reusable prompt, goal, handoff, or knowledge card.

Good triggers:

- Paste-ready prompt
- Future session goal
- Reusable UI task pattern
- Pack documentation

Role:

- Keep reusable prompts concrete and operational.

## Routing Rule

Use `frontend-design-boost` as the frontend quality gate.
Use the companion skills for the workflow they already own.
Do not duplicate their full instructions inside this pack.

## Recommended Order

1. `brainstorming` before creative frontend implementation, scaled to how much direction is already fixed.
2. `frontend-design-boost` for page type, tokens, anti-patterns, and states.
3. Product Design bridge when the work is product/prototype/redesign/audit-like and `@Product Design` may add value.
4. `deep-research-dag` if current external references are needed before choosing the design strategy.
5. `imagegen` only if the task needs real bitmap assets.
6. `test-driven-development` when UI behavior changes.
7. Implementation in the repo's existing style.
8. `playwright` for screenshots and rendered inspection.
9. `requesting-code-review` for substantial changes when review-agent use is allowed; otherwise do a local review pass.
10. `verification-before-completion` before final claims.
