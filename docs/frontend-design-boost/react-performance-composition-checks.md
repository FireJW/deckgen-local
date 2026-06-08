# React Performance and Composition Checks

Source: `vercel-labs/agent-skills`
Checked: 2026-06-01

This is a local reference card, not an installed upstream skill. It distills the useful review categories from Vercel's `react-best-practices`, `web-design-guidelines`, `composition-patterns`, and `react-view-transitions` skills into the existing `frontend-design-boost` workflow.

## Do Not Install Wholesale

Do not install `vercel-labs/agent-skills` as the default local behavior. The local pack already owns page-type discipline, screenshot QA, fixed browser/tool routing, image-generation gates, and repo-specific frontend constraints. Use this card as a review overlay when the target repo is React, Next.js, or React/Tailwind.

## Apply When

- Building or reviewing React components, Next.js pages, dashboards, or product UI.
- The UI is visually acceptable but may be slow, over-bundled, inaccessible, or hard for agents to refactor.
- Components are accumulating boolean props, render-prop variants, or mixed ownership.
- A transition or animation is requested and needs a clear spatial purpose.

## Performance Review Stack

Run these checks before inventing new UI structure:

1. Waterfalls: independent async work should start early and settle together. Use patterns equivalent to `async-parallel`; do not await feature flags, remote config, or unrelated data in serial when the result can be parallelized.
2. Bundle size: avoid broad imports and barrel files when a direct import is available. Treat `bundle-barrel-imports` and dynamic imports for heavy UI as review prompts, not automatic rewrites.
3. Server state: avoid mutable module-level request state in SSR/RSC code. Treat `server-no-shared-module-state` as a hard review item for Next.js server surfaces.
4. Serialization: do not pass large duplicated data into client components when a smaller view model is enough.
5. Re-render pressure: split hooks by dependency, move interaction-only logic into event handlers, hoist stable non-primitive defaults, and avoid defining components inside components.
6. Rendering cost: use content visibility or virtualization for long lists only after confirming the user workflow still has readable empty, loading, and error states.

## Composition Review Stack

Use these checks when component APIs start to sprawl:

1. Boolean props: treat `architecture-avoid-boolean-props` as a warning. Prefer explicit variant components or composition slots when a component has multiple modes.
2. Compound components: use a shared provider only when children need coordinated state. Do not introduce context for one-off styling.
3. State ownership: the provider or parent boundary should be the only layer that knows implementation details; leaves should receive stable, narrow props.
4. Children before render props: prefer children and named subcomponents for structure unless a render callback carries real behavior.
5. React version gate: React 19-specific patterns require checking the target repo version first.

## Accessibility and UI Review Stack

Use this alongside screenshot QA:

- Preserve semantic HTML before building div-based controls.
- Keep visible focus states, keyboard paths, and tap targets for icon buttons and dense toolbars.
- Validate forms with clear error text, not only color.
- Keep URL/state reflection for filters, tabs, and deep-linked product surfaces when users need to share or return to a state.
- Pair every meaningful data surface with loading, empty, error, disabled, hover, focus, and active states.

## Motion and View Transition Gate

Do not add motion just because a library supports it:

- Shared element transitions should communicate continuity between the same object.
- Directional transitions should communicate hierarchy or sequence, not lateral tabs.
- Always respect reduced motion.
- For React view transitions, check placement, unique names, fallback behavior, and browser support before implementation.

## Screenshot QA Additions

In addition to the standard desktop and mobile screenshots:

- Capture at least one interaction state for any component that changed due to composition or performance work.
- Check for hydration flicker, late layout shift, clipped focus rings, and table/grid overflow.
- For performance-motivated changes, include a short note naming the targeted risk: waterfall, bundle, server state, serialization, re-render, rendering, or composition.

## Local Adoption Rule

If this card finds a gap, update the target repo's UI or test artifact first. Only update `frontend-design-boost` itself when the same gap appears across multiple repos or workflows.
