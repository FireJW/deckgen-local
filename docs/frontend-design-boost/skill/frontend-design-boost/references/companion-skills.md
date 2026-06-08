# Companion Skills

Use this reference when a frontend task needs help from another Codex skill.

## Routing

- Use `brainstorming` before creative frontend implementation, scaled to how much direction is already fixed.
- Use `@Product Design` directly for product/prototype/redesign/URL-to-code/image-to-code/audit/design-QA work when the current session exposes it; otherwise run `npm.cmd run readiness:frontend-design-boost:product-design` and follow `docs/frontend-design-boost/product-design-plugin-bridge.md`. Before prototype-like implementation, run `npm.cmd run brief:frontend-design-boost:product-design -- --brief <brief.md>` to create a Product Design task brief preflight with route decision and evidence requirements. When three visual directions are required but Product Design is not callable, run `npm.cmd run ideate:frontend-design-boost:product-design` to scaffold or validate `product-design-ideation.md`. When source-vs-implementation comparison is required but Product Design is not callable, run `npm.cmd run design-qa:frontend-design-boost:product-design` to scaffold or validate `design-qa.md`. When product-flow UX/design/accessibility critique is required but Product Design is not callable, run `npm.cmd run audit:frontend-design-boost:product-design` to scaffold or validate `product-design-audit.md`.
- Use `imagegen` when the page needs real bitmap assets.
- Use `deep-research-dag` when current external references, multiple source families, or conflicting UI guidance need synthesis before layout decisions.
- Use `playwright` for browser screenshots, snapshots, interactions, and visual QA.
- Use `verification-before-completion` before claiming the work is complete.
- Use `requesting-code-review` after substantial frontend implementation or before merge when review-agent use is allowed; otherwise do a local review pass.
- Use `test-driven-development` when UI behavior or logic changes.
- Use `prompt-patterns` when producing reusable prompts, goals, handoffs, or cards.

## Order

1. Clarify direction with `brainstorming`, keeping it short when the user already approved the design direction.
2. Apply `frontend-design-boost` for page type, tokens, states, and anti-patterns.
3. Bring in `deep-research-dag` if the task depends on current external methods or source-backed design comparisons.
4. Bring in Product Design bridge for prototype-like work, preserving the brief gate, three-direction ideation, No Visual Target, No Build rule, and `design-qa.md` handoff when falling back locally.
5. Bring in `imagegen` only for project-bound bitmap visuals.
6. Use `test-driven-development` for interaction logic.
7. Build in the repo's existing frontend style.
8. Use `playwright` for desktop and mobile screenshots.
9. Use `requesting-code-review` for substantial frontend changes when review-agent use is allowed; otherwise do a local review pass.
10. Use `verification-before-completion` before final handoff.

## Boundary

Do not duplicate companion skill bodies here.
Load the companion skill only when its trigger applies.
