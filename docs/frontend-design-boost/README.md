# Frontend Design Boost

Use this pack for HTML, React, and Tailwind frontend work that needs page-type discipline, token preflight, companion-skill routing, and visual QA.

## Entry Points

- Skill draft: `docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md`
- Prompt draft: `docs/frontend-design-boost/prompt.md`
- Reference bank: `docs/frontend-design-boost/reference-bank.md`
- Integration shortlist: `docs/frontend-design-boost/integration-candidate-shortlist.md`
- Integration rubric: `docs/frontend-design-boost/integration-selection-rubric.md`
- Image-assisted workflow: `docs/frontend-design-boost/image-assisted-frontend-workflow.md`
- QA gate candidates: `docs/frontend-design-boost/qa-gate-candidates.md`
- React performance and composition checks: `docs/frontend-design-boost/react-performance-composition-checks.md`
- Frontend debug evidence bundle: `docs/frontend-design-boost/frontend-debug-evidence-bundle.md`
- Product Design plugin bridge: `docs/frontend-design-boost/product-design-plugin-bridge.md`
- Product Design bridge readiness: `scripts/frontend-design-boost-product-design-readiness.mjs`
- Product Design task brief preflight: `scripts/frontend-design-boost-product-design-brief.mjs`
- Product Design ideation scaffold: `scripts/frontend-design-boost-product-design-ideate.mjs`
- Product Design design QA scaffold: `scripts/frontend-design-boost-product-design-qa.mjs`
- Product Design flow audit scaffold: `scripts/frontend-design-boost-product-design-audit.mjs`
- Image workflow acceptance: `scripts/frontend-design-boost-image-acceptance.mjs`
- Image workflow decision: `scripts/frontend-design-boost-image-decision.mjs`
- Image workflow evidence: `scripts/frontend-design-boost-image-evidence.mjs`
- Image implementation handoff: `scripts/frontend-design-boost-image-implementation-handoff.mjs`
- Built-in imagegen import: `scripts/frontend-design-boost-imagegen-import.mjs`
- Built-in imagegen acceptance: `scripts/frontend-design-boost-imagegen-acceptance.mjs`
- CC Switch acceptance: `scripts/frontend-design-boost-ccswitch-acceptance.mjs`
- Goal/readiness audit: `scripts/frontend-design-boost-goal-audit.mjs`
- Image prompt pack lab: `scripts/frontend-design-boost-image-assist.mjs`
- Image job plan: `scripts/frontend-design-boost-image-jobs-plan.mjs`
- Image job runner: `scripts/frontend-design-boost-image-jobs-run.mjs`
- Image workflow orchestrator: `scripts/frontend-design-boost-image-workflow.mjs`
- Installed skill sync helper: `scripts/frontend-design-boost-skill-sync.mjs`
- Installed skill readiness report: `scripts/frontend-design-boost-skill-readiness.mjs`
- Installed skill drift check: `scripts/frontend-design-boost-skill-drift.mjs`
- Asset smoke gate: `scripts/frontend-design-boost-asset-smoke.mjs`
- Asset intake report: `scripts/frontend-design-boost-asset-intake.mjs`
- Case library: `docs/frontend-design-boost/case-library/README.md`
- Visual QA checklist: `docs/frontend-design-boost/visual-qa-checklist.md`
- Demo brief: `fixtures/frontend-design-boost/saas-dashboard-brief.md`
- Demo fixture: `fixtures/frontend-design-boost/dashboard-demo.html`
- Reference intake fixture: `fixtures/frontend-design-boost/reference-intake.md`
- Research brief: `fixtures/frontend-design-boost/research-dashboard-brief.md`
- Research fixture: `fixtures/frontend-design-boost/research-dashboard-demo.html`

## Local Case Library

- OCMacro Trump dashboard case: `docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md`

## Fixture QA

Run the standalone demo check with:

`npm.cmd run qa:frontend-design-boost`

The script writes screenshots under `.tmp/frontend-design-boost/`.

Inspect whether the cached Product Design plugin can inform this pack with:

`npm.cmd run readiness:frontend-design-boost:product-design`

The report is read-only. It checks the local `openai-curated-remote/product-design` cache, lists the core Product Design skills, and tells future sessions when to call `@Product Design` directly versus using the local `frontend-design-boost` fallback.

Generate a repo-local Product Design task brief preflight before prototype-like work with:

`npm.cmd run brief:frontend-design-boost:product-design -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md`

Add `--visual-source <url-or-path>` when a source URL, screenshot, mockup, image, or code surface already exists. Without a visual source, the report applies No Visual Target, No Build and routes to `@Product Design` `ideate` or local `flow:frontend-design-boost:image` before implementation.

Scaffold Product Design-style three-direction ideation prompt seeds with:

`npm.cmd run ideate:frontend-design-boost:product-design -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md --surface-type desktop-dashboard --mode broad-exploration`

The scaffold writes `product-design-ideation.md` and starts blocked until exactly three independent images are generated and the user selects one visual target. Validate an existing ideation report with `--check <product-design-ideation.md>`.

Scaffold a Product Design-style `design-qa.md` before fallback handoff with:

`npm.cmd run design-qa:frontend-design-boost:product-design -- --source <source-screenshot-or-url> --implementation <implementation-screenshot-or-url> --viewport 1440x900 --state default`

The scaffold starts as `final result: blocked` until a real source-vs-implementation comparison is captured. Validate an existing report with `--check <design-qa.md>`.

Scaffold a Product Design-style flow audit evidence pack with:

`npm.cmd run audit:frontend-design-boost:product-design -- --surface <path-or-url> --flow "triage dashboard" --steps "Open dashboard;Inspect priority signals" --destination local-folder`

The scaffold writes `product-design-audit.md` and starts blocked until current-run screenshots are captured, inspected, and tied to UX/design/accessibility findings. Validate an existing audit report with `--check <product-design-audit.md>`.

Run the research dashboard demo check with:

`npm.cmd run qa:frontend-design-boost:research`

The script writes screenshots under `.tmp/frontend-design-boost/`.

Run the image prompt pack lab with:

`npm.cmd run lab:frontend-design-boost:image`

The script writes prompt-pack artifacts, `asset-selection.json`, `asset-consumption-demo.html`, `imagegen-handoff.json`, `image-generation-jobs.json`, and a browser preview under `.tmp/frontend-design-boost/image-prompt-pack/`.
Pass a real frontend brief with `--brief`, for example:

`npm.cmd run lab:frontend-design-boost:image -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md`

After selecting external references from the shortlist or case library, pass a repo-local intake file with `--reference-intake`:

`npm.cmd run lab:frontend-design-boost:image -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md --reference-intake fixtures/frontend-design-boost/reference-intake.md`

Review the generated job manifest without executing any image command:

`npm.cmd run plan:frontend-design-boost:image-jobs -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json`

For the default Codex `imagegen` skill route, inspect `imagegen-handoff.json` or `imagegen-handoff.md`. It records the built-in `image_gen` prompts, the `CODEX_HOME/generated_images` source expectation, project-local asset destinations, and the post-generation asset smoke/intake/decision gates without requiring `OPENAI_API_KEY`.

After built-in generation, import the selected output into the planned project-local asset path:

`npm.cmd run import:frontend-design-boost:imagegen-assets -- --handoff .tmp/frontend-design-boost/image-prompt-pack/imagegen-handoff.json --asset-id visual-direction-1 --source <CODEX_HOME-generated-png>`

This writes `imagegen-import-report.json` and `imagegen-import.md`, validates PNG dimensions, copies the selected output into the handoff `finalAssetPath`, and prepares the asset smoke and evidence gates.

To run the built-in route's post-generation gates in one local command, use:

`npm.cmd run acceptance:frontend-design-boost:imagegen-assets -- --handoff .tmp/frontend-design-boost/image-prompt-pack/imagegen-handoff.json --asset-id visual-direction-1 --source <CODEX_HOME-generated-png>`

This writes `imagegen-acceptance-report.json`, `imagegen-acceptance.md`, `goal-audit-report.json`, `asset-intake-report.json`, `image-decision-report.json`, and `image-implementation-handoff-report.json`; it chains import, asset smoke, image evidence, asset intake, image decision, implementation handoff, and read-only goal audit while keeping the next desktop and mobile screenshot QA gate explicit.

Audit the current repo-local workflow, installed-skill sync state, default built-in route evidence, and optional CLI fallback readiness without executing generation:

`npm.cmd run audit:frontend-design-boost:goal -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json`

After a built-in `imagegen` run has been imported and accepted, pass evidence, acceptance, and implementation handoff files so the audit can distinguish an actual `CODEX_HOME/generated_images` source from a repo-local placeholder and keep `goalComplete` blocked until the design extraction handoff is ready:

`npm.cmd run audit:frontend-design-boost:goal -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json --live-evidence .tmp/frontend-design-boost/image-prompt-pack/image-evidence-report.json --imagegen-acceptance .tmp/frontend-design-boost/image-prompt-pack/imagegen-acceptance-report.json --implementation-handoff .tmp/frontend-design-boost/image-prompt-pack/image-implementation-handoff-report.json`

For an approved `ccswitch` fallback run, keep the same jobs, runner report, evidence, decision, and implementation-handoff chain, but omit `--imagegen-acceptance`. The `imagegen-acceptance-report.json` gate is only for built-in `imagegen` outputs imported from `CODEX_HOME/generated_images`; `ccswitch` live evidence is verified through `--live-evidence` plus `--implementation-handoff`:

`npm.cmd run audit:frontend-design-boost:goal -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json --live-evidence .tmp/frontend-design-boost/image-prompt-pack/image-evidence-report.json --implementation-handoff .tmp/frontend-design-boost/image-prompt-pack/image-implementation-handoff-report.json`

After an approved `ccswitch` live run has produced a project-local PNG and a `runner-report.json`, run the route-specific acceptance wrapper to chain asset smoke, image evidence, asset intake, image decision, implementation handoff, and read-only goal audit without invoking the image API:

`npm.cmd run acceptance:frontend-design-boost:ccswitch-assets -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json --job visual-direction-1 --asset output/imagegen/frontend-design-boost/visual-direction-1.png --runner-report .tmp/frontend-design-boost/image-prompt-pack/runner-report.json`

This writes `ccswitch-acceptance-report.json`, `ccswitch-acceptance.md`, `asset-smoke-report.json`, `image-evidence-report.json`, `asset-intake-report.json`, `image-decision-report.json`, `image-implementation-handoff-report.json`, and `goal-audit-report.json`.

Preview or execute a selected image-generation job from the manifest:

`npm.cmd run run:frontend-design-boost:image-job -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json --job visual-direction-1 --report .tmp/frontend-design-boost/image-prompt-pack/runner-report.json`

Add `--apply` only when you intentionally want to run the selected job command. Keep `--report` so the follow-up evidence command has a local runner report to validate.

Run the full local workflow preview in one command:

`npm.cmd run flow:frontend-design-boost:image -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md --reference-intake fixtures/frontend-design-boost/reference-intake.md`

Add `--apply` only when you intentionally want the selected job runner to execute the image command.

Run the local image workflow acceptance report with:

`npm.cmd run acceptance:frontend-design-boost:image -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md --reference-intake fixtures/frontend-design-boost/reference-intake.md`

This aggregates workflow preview, prompt-pack QA, asset intake, and installed-skill readiness without executing image generation.

Run the local image decision report with:

`npm.cmd run decision:frontend-design-boost:image`

This converts the asset intake report into an image decision matrix with acceptance criteria, extraction prompts, and implementation handoff notes.

After image decision, evidence, and built-in acceptance reports exist, create the implementation handoff with:

`npm.cmd run handoff:frontend-design-boost:image -- --decision .tmp/frontend-design-boost/image-prompt-pack/image-decision-report.json --evidence .tmp/frontend-design-boost/image-prompt-pack/image-evidence-report.json --acceptance .tmp/frontend-design-boost/image-prompt-pack/imagegen-acceptance-report.json`

This writes `image-implementation-handoff-report.json` and `image-implementation-handoff.md`, consolidating the selected asset, `gpt-image-2` route evidence, design token extraction prompts, do-not-copy rules, and the HTML/React/Tailwind implementation checklist.

After a selected live `gpt-image-2` job has produced a project-local PNG, record the evidence with:

`npm.cmd run evidence:frontend-design-boost:image -- --jobs .tmp/frontend-design-boost/image-prompt-pack/image-generation-jobs.json --job visual-direction-1 --runner-report .tmp/frontend-design-boost/image-prompt-pack/runner-report.json`

For the built-in `imagegen` route, use the handoff instead of a CLI runner report:

`npm.cmd run evidence:frontend-design-boost:image -- --handoff .tmp/frontend-design-boost/image-prompt-pack/imagegen-handoff.json --asset-id visual-direction-1 --asset output/imagegen/frontend-design-boost/visual-direction-1.png`

This writes `image-evidence-report.json` and `image-evidence.md`, validates the PNG dimensions against the selected job or handoff asset, and gives `audit:frontend-design-boost:goal` a concrete live-generation proof file through `--live-evidence`.

Run image prompt pack visual QA with:

`npm.cmd run qa:frontend-design-boost:image`

The script rebuilds the prompt pack, statically validates the generated preview HTML, checks the asset selection manifest, generation job manifest, and consumption demo, and writes `qa-report.json` under `.tmp/frontend-design-boost/image-prompt-pack/`.
It accepts the same `--brief` and `--reference-intake` overrides, for example:

`npm.cmd run qa:frontend-design-boost:image -- --brief fixtures/frontend-design-boost/saas-dashboard-brief.md`

After the selected images have been generated into the project-local output paths, run:

`npm.cmd run smoke:frontend-design-boost:assets`

This validates the generated PNG assets referenced by `asset-selection.json`.

After generation or while assets are still pending, write a design extraction and implementation handoff report with:

`npm.cmd run intake:frontend-design-boost:assets`

The command writes `asset-intake-report.json` and `asset-intake.md` next to the prompt pack by default.

## Installed Skill Drift Check

After updating or installing the user-level skill, run:

`npm.cmd run check:frontend-design-boost-skill`

The check compares the repo skill draft with `$CODEX_HOME/skills/frontend-design-boost` and verifies the installed skill includes the case-library routing markers.

Before writing outside the repo, inspect the current installed-skill status with:

`npm.cmd run readiness:frontend-design-boost-skill`

This prints a read-only report with stale files, missing workflow markers, and the approval-gated sync command.

To stage a safe dry-run sync or explicitly apply the repo skill draft to the installed skill, use:

`npm.cmd run sync:frontend-design-boost-skill`

Add `--apply` only when you intentionally want to write the installed skill copy.

