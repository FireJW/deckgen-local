# Image Assisted Frontend Workflow

Use this workflow when `frontend-design-boost` needs AI-generated bitmap references or project-bound images for HTML, React, Tailwind, dashboards, landing pages, report covers, empty states, or editorial visuals.

`gpt-image-2` access through the built-in `imagegen` route helps most as a visual accelerator; the `ccswitch` CLI path is a fallback when explicitly approved and configured. Image generation does not replace information architecture, component implementation, accessibility checks, responsive QA, or source review.

Source anchors:

- OpenAI GPT Image 2 model docs: https://platform.openai.com/docs/models/gpt-image-2
- OpenAI image generation guide: https://platform.openai.com/docs/guides/image-generation

Verify current OpenAI docs before relying on model-specific parameters.

## Reference Intake

Use reference intake after selecting useful external sources from the local case library, shortlist, or current research. The intake file should name the sources, what to extract, prompt cues, and what must not be copied. It is prompt-shaping guidance, not dependency approval and not permission to copy screenshots, brand assets, proprietary copy, or source code.

Fixture: `fixtures/frontend-design-boost/reference-intake.md`

## When To Use

### Visual Direction

Use generated images to explore:

- Palette and surface direction
- Hero or first-viewport tone
- Illustration style
- Product screenshot framing
- Report or dashboard cover art
- Dense versus spacious composition options

Output should be a reference set, not code. Extract design decisions before implementation.

### Project Assets

Use generated images for assets that should ship with the local artifact:

- Hero images
- Empty-state illustrations
- Report cover backgrounds
- Section thumbnails
- Social preview images
- Lightweight product mockups

Move accepted assets into the project or generated artifact directory before referencing them from HTML or React. Do not leave final UI references pointing only to a temporary Codex or user cache path.

### Style Variants

Ask for two to four variations when the design direction is uncertain. Keep the implementation decision explicit:

- Chosen variant
- Rejected variants
- Design tokens extracted
- Risks or caveats

### Existing Image Edits

Use image editing when an existing visual is close but needs:

- Cropping or reframing
- Less visual noise
- A clearer product focal point
- A consistent palette
- A background or lighting adjustment

Do not edit third-party assets unless licensing and usage are acceptable for the task.

## Do Not Use For

- Responsive layout correctness
- Table, filter, sort, or navigation behavior
- Keyboard interaction and focus management
- Accessibility semantics
- Accurate chart data or financial data
- Deterministic logos, icons, or brand marks
- SVG systems where repo-native vector editing is the better path
- Final copy or data validation

For transparent assets, do not assume `background=transparent` is available for `gpt-image-2`. Check the current image model docs and the installed `imagegen` skill. If native transparency is not available for the selected route, use a documented fallback such as a solid chroma background plus local cutout workflow, or switch to an approved model route that supports transparency.

## Recommended Flow

1. Brief: page type, audience, primary action, density target, and real content constraints.
2. Reference intake: if external sources should steer visual direction, write a small repo-local intake file that names what to extract and what not to copy.
3. Prompt pack: run `npm.cmd run lab:frontend-design-boost:image -- --brief <brief.md> --reference-intake <reference-intake.md>` to turn the real frontend brief and selected references into repeatable prompt, command, preview, asset-selection, asset-consumption, built-in imagegen handoff, generation-jobs, and QA artifacts.
4. One-command workflow: run `npm.cmd run flow:frontend-design-boost:image -- --brief <brief.md> --reference-intake <reference-intake.md>` to rebuild the pack, plan the jobs, and preview the selected runner command without executing image generation.
5. Acceptance preview: run `npm.cmd run acceptance:frontend-design-boost:image -- --brief <brief.md> --reference-intake <reference-intake.md>` to aggregate workflow preview, prompt-pack QA, asset intake, and installed-skill readiness without executing image generation.
6. Image decision: run `npm.cmd run decision:frontend-design-boost:image` after asset intake to convert the available and pending references into a visual decision matrix with acceptance criteria, extraction prompts, and implementation handoff notes.
7. Goal audit: run `npm.cmd run audit:frontend-design-boost:goal -- --jobs <image-generation-jobs.json>` when you need a read-only status report across repo artifacts, installed-skill sync state, default route evidence, and optional CLI fallback gates. Add `--live-evidence <image-evidence-report.json>` after a real selected job has been recorded, add `--imagegen-acceptance <imagegen-acceptance-report.json>` for the built-in route so the audit can verify external `CODEX_HOME/generated_images` provenance, and add `--implementation-handoff <image-implementation-handoff-report.json>` before claiming goal completion.
8. Built-in imagegen handoff: inspect `imagegen-handoff.json` or `imagegen-handoff.md` when using the installed `imagegen` skill default built-in `image_gen` route. It does not require `OPENAI_API_KEY`; generate each prompt, then import the selected output from `CODEX_HOME/generated_images` into the listed project-local asset path.
9. Built-in output import: run `npm.cmd run import:frontend-design-boost:imagegen-assets -- --handoff <imagegen-handoff.json> --asset-id <asset-id> --source <generated-png>` to copy the selected PNG into `finalAssetPath`, validate dimensions, and write `imagegen-import-report.json`.
10. Built-in output acceptance: run `npm.cmd run acceptance:frontend-design-boost:imagegen-assets -- --handoff <imagegen-handoff.json> --asset-id <asset-id> --source <generated-png>` when you want one local gate that chains import, asset smoke, image evidence, asset intake, image decision, implementation handoff, and read-only goal audit, then writes `imagegen-acceptance-report.json`, `goal-audit-report.json`, `asset-intake-report.json`, `image-decision-report.json`, and `image-implementation-handoff-report.json`. The generated goal audit receives `--implementation-handoff` automatically.
11. Generation jobs: review `image-generation-jobs.json` before using the optional CLI fallback so the model, transport, outputs, and approval gate are explicit. Use `npm.cmd run plan:frontend-design-boost:image-jobs -- --jobs <image-generation-jobs.json>` for a no-execution fallback readiness plan.
12. Job runner preview: run `npm.cmd run run:frontend-design-boost:image-job -- --jobs <image-generation-jobs.json> --job <job-id> --report <runner-report.json>` to preview the selected structured command and environment blockers. This CLI fallback mode does not execute image generation by default, and the report path gives the later evidence step a stable input.
13. Image prompt: after explicit approval, either use the built-in `imagegen` handoff route or add `--apply` to the selected CLI job runner command to generate visual direction or project-bound assets with `gpt-image-2`.
14. Evidence record: after a selected live job writes a project-local PNG, run `npm.cmd run evidence:frontend-design-boost:image -- --jobs <image-generation-jobs.json> --job <job-id> --runner-report <runner-report.json>` for the CLI fallback route, or `npm.cmd run evidence:frontend-design-boost:image -- --handoff <imagegen-handoff.json> --asset-id <asset-id> --asset <asset.png>` for the built-in imagegen route. Both write `image-evidence-report.json` and `image-evidence.md`.
15. Selection: choose or reject variants based on task fit, not aesthetics alone, then update or review `asset-selection.json`.
16. Extraction: turn the chosen image into tokens, component intent, layout rhythm, and asset usage rules.
17. Implementation handoff: run `npm.cmd run handoff:frontend-design-boost:image -- --decision <image-decision-report.json> --evidence <image-evidence-report.json> --acceptance <imagegen-acceptance-report.json>` for the built-in route, or omit `--acceptance` for a `ccswitch` fallback report, to consolidate the selected asset, route evidence, design token extraction prompts, do-not-copy rules, and HTML/React/Tailwind implementation checklist.
18. Implementation bridge: inspect `asset-consumption-demo.html` to verify the selected hero, empty-state, and visual-direction slots degrade cleanly before wiring assets into HTML, React, or Tailwind code.
19. Implementation: build the UI in HTML, React, or Tailwind using repo-native patterns and project-local asset paths.
20. Prompt-pack QA: run `npm.cmd run qa:frontend-design-boost:image -- --brief <brief.md> --reference-intake <reference-intake.md>` to validate the generated prompt pack, reference intake, generation jobs, built-in imagegen handoff, selection manifest, consumption demo, preview HTML, commands, and QA checklist.
21. Asset intake: run `npm.cmd run intake:frontend-design-boost:assets` to turn generated or pending assets into `asset-intake-report.json` and `asset-intake.md`, including design extraction prompts, pending-asset status, and implementation handoff notes.
22. Asset smoke: after generating the PNGs into the project-local output paths, run `npm.cmd run smoke:frontend-design-boost:assets` to confirm the selected assets exist, decode as PNGs, and match the declared sizes.
23. Screenshot QA: verify the implemented UI at desktop and mobile sizes.
24. Handoff: record prompts, reference intake, acceptance report, built-in imagegen acceptance report, image implementation handoff, decision report, evidence report, import report, built-in imagegen handoff, generation jobs, runner report, asset intake report, asset paths, selection manifest, consumption demo, asset smoke result, viewport checks, `--imagegen-acceptance` and `--implementation-handoff` audit inputs, and remaining risks.

## Extraction Checklist

Before coding, extract:

- Palette roles: background, surface, border, text, accent, warning, success, danger
- Surface rules: flat, raised, bordered, frosted, photographic, or editorial
- Radius and border rules
- Typography hierarchy and density
- Grid rhythm and first-viewport information hierarchy
- Visual asset placement and crop behavior
- Chart or data-display treatment, if relevant
- Interaction states that must still be built manually
- Anti-patterns to avoid from the generated result

Generated references often look polished while hiding impossible spacing or unreadable text. Treat them as visual inputs, not implementation truth.

## Prompt Templates

### Visual Direction Set

```text
Create 3 distinct visual directions for a [page type] used by [audience].
The UI must feel [density target] and support [primary action].
Use realistic product UI composition, not marketing filler.
Avoid oversized rounded cards, purple-blue gradients, and decorative blobs.
Return reference images suitable for extracting palette, layout rhythm, typography hierarchy, and asset style.
```

### Project Asset

```text
Create a project-bound bitmap asset for [surface: hero / empty state / report cover / thumbnail].
It will be used in a [HTML / React / Tailwind] UI with [content constraints].
Leave clear safe space for overlaid UI where needed.
Do not include unreadable fake UI text.
Use a style that can coexist with [repo or product style notes].
```

### Dashboard Or Report Exploration

```text
Create visual references for a [dashboard / research report] about [domain].
The first viewport should prioritize [top insight or workflow], then support scan-first secondary information.
Use restrained operational density, legible chart areas, and clear data hierarchy.
Do not use a landing-page hero layout.
```

### Extraction Prompt

```text
Analyze this generated reference for implementation.
Extract palette roles, spacing rhythm, radius, typography hierarchy, component groups, responsive risks, and anti-patterns.
Separate what should be copied as design intent from what must be rebuilt manually in code.
```

## Screenshot QA

Image-assisted work still must pass the normal `frontend-design-boost` QA gates:

- Desktop screenshot: 1440 x 900
- Mobile screenshot: 390 x 844
- No text overflow
- No overlapping controls or content
- Real assets load from project-local paths
- Interactive states are represented where relevant
- Tables, grids, charts, and panels remain usable on mobile
- Generated images do not obscure primary copy or controls

Record the image prompt, accepted asset path, `asset-selection.json`, `asset-consumption-demo.html`, asset smoke output, screenshot paths, viewport sizes, and any unresolved risk in the handoff.

## CC Switch Fallback Evidence

Use the `ccswitch` route only when it is already approved and configured as an OpenAI-compatible image endpoint for `gpt-image-2`. Keep provider credentials out of repo artifacts; reports may name the transport, model, selected job, dimensions, and project-local output path, but must not store bearer tokens or API keys.

For this route, the acceptance shape is:

1. Put the selected PNG under a project-local generated path such as `output/imagegen/frontend-design-boost/<asset-id>.png`.
2. Keep `image-generation-jobs.json` explicit: `model: "gpt-image-2"`, `transport: "ccswitch"`, `routeRole: "cli-fallback"`, `executionMode: "approval-gated"`, and no repo-secret environment requirements unless the runner truly needs them.
3. Record the live run in `runner-report.json` with `executed: true`, `transport: "ccswitch"`, the selected job id, output path, and exit code.
4. Run or produce `image-evidence-report.json`, then `asset-intake-report.json`, `image-decision-report.json`, and `image-implementation-handoff-report.json`.
5. Audit with `--live-evidence <image-evidence-report.json> --implementation-handoff <image-implementation-handoff-report.json>`. Do not pass `--imagegen-acceptance` for `ccswitch`; that report is specifically for the built-in `imagegen` route and external `CODEX_HOME/generated_images` provenance.

When the selected live PNG and `runner-report.json` already exist, prefer the route-specific wrapper:

```text
npm.cmd run acceptance:frontend-design-boost:ccswitch-assets -- --jobs <image-generation-jobs.json> --job <job-id> --asset <project-local.png> --runner-report <runner-report.json>
```

It chains asset smoke, image evidence, asset intake, image decision, implementation handoff, and the read-only goal audit without calling the image API. The wrapper writes `ccswitch-acceptance-report.json`, `ccswitch-acceptance.md`, `asset-smoke-report.json`, `image-evidence-report.json`, `asset-intake-report.json`, `image-decision-report.json`, `image-implementation-handoff-report.json`, and `goal-audit-report.json`.

The generated bitmap is still only visual direction. Extract palette roles, density, layout rhythm, and responsive risks, then rebuild controls, states, data, semantics, and accessibility in HTML, React, or Tailwind.
