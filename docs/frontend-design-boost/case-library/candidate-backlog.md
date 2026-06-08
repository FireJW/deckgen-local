# Frontend Design Boost Candidate Backlog

Sources checked on 2026-05-26.

This backlog lists public frontend design references that are good candidates for future local case notes or demo fixtures. Do not copy screenshots, data, source wording, brand marks, or proprietary layouts. Use the references to extract reusable structure, interaction logic, state handling, and QA gates.

## Selection Rules

- Prefer public, source-backed references with docs, examples, or runnable demos.
- Prioritize patterns that fill gaps in the local case library.
- Capture screenshots only when a case is promoted from backlog to a full case note.
- Keep the local artifact synthetic unless the source license and user approval allow reuse.
- Every promoted case needs an acceptance gate before it changes the installed skill.

## Candidate Cases

| Priority | Candidate | Source | Best Local Use |
| --- | --- | --- | --- |
| Promoted | shadcn/ui dashboard block | https://v3.shadcn.com/blocks | Promoted to `shadcn-dashboard-block.md`; keep here as the source reference for future fixture work. |
| Promoted | Cloudscape service dashboard | https://cloudscape.design/demos/overview and https://cloudscape.design/patterns/general/filter-patterns/ | Promoted to `cloudscape-service-dashboard.md`; keep here as the source reference for enterprise console pages, resource tables, property filters, table/card view switching, and large collection states. |
| Promoted | Shopify Polaris resource index | https://polaris-react.shopify.com/patterns/resource-index-layout and https://polaris-react.shopify.com/components/selection-and-input/index-filters | Promoted to `shopify-resource-index.md`; keep here as the source reference for merchant/admin resource lists, filtering, sorting, bulk actions, and native admin workflows. |
| Promoted | Elastic EUI data grid | https://eui.elastic.co/docs/components/data-grid/ | Promoted to `elastic-eui-data-grid.md`; keep here as the source reference for dense observability or financial tables with many columns, schemas, sorting, truncation, popovers, and toolbar controls. |
| Promoted | GOV.UK task list | https://design-system.service.gov.uk/components/task-list/ and https://design-system.service.gov.uk/patterns/question-pages/ | Promoted to `govuk-task-list-flow.md`; keep here as the source reference for long transactional flows, status scanning, one-question-per-page forms, and content-first accessibility. |
| Promoted | Stripe API reference | https://docs.stripe.com/api | Promoted to `stripe-api-reference.md`; keep here as the source reference for developer documentation, split navigation, reference hierarchy, API object pages, and code-example density. |
| Promoted | Tremor charts and dashboards | https://tremor.so/charts and https://npm.tremor.so/ | Promoted to `tremor-chart-dashboard.md`; keep here as the source reference for data-rich chart cards, KPI rhythm, chart variant selection, and React/Tailwind analytics surfaces. |

## Extraction Notes

### shadcn/ui dashboard block

- Extract: shell/sidebar layout, section card rhythm, chart/table pairing, local component ownership.
- Avoid: adding dependencies blindly or treating block output as final UX.
- Local artifact idea: a synthetic SaaS operations demo that uses sidebar, chart, data table, and state cards.
- acceptance gate: verify mobile sidebar behavior, table overflow, keyboard focus, and empty/loading/error states.

### Cloudscape service dashboard

- Extract: filtering complexity ladder, resource collection behavior, table/card view tradeoffs, console density.
- Avoid: copying AWS visual identity or importing Cloudscape when repo-native controls are enough.
- Local artifact idea: a cloud-resource monitor fixture with property filters, saved views, and card/table toggle; the source-backed note now lives in `cloudscape-service-dashboard.md`.
- acceptance gate: verify filter controls operate on the full collection conceptually, not only visible rows.

### Shopify Polaris resource index

- Extract: resource summary list, merchant/admin mental model, bulk actions, filtering, sorting, pagination, loading and empty states.
- Avoid: relying on stale Polaris React syntax without checking current docs.
- Local artifact idea: an admin resource index fixture for accounts, orders, or watchlist items; the source-backed note now lives in `shopify-resource-index.md`.
- acceptance gate: verify list item tap targets, selected-row state, bulk-action state, and mobile behavior.

### Elastic EUI data grid

- Extract: data-grid use criteria, schema-aware columns, truncation-plus-popover detail, toolbar customization, control columns.
- Avoid: using grids for sparse data or hiding critical content behind truncation without a disclosure path.
- Local artifact idea: a dense risk exposure table fixture with column visibility, row actions, and overflow-safe cells; the source-backed note now lives in `elastic-eui-data-grid.md`.
- acceptance gate: verify table semantics, horizontal behavior, keyboard navigation expectations, and long-cell handling.

### GOV.UK task list

- Extract: task names, statuses, grouped task lists, one-question-per-page discipline, back links, and simple progress indicators.
- Avoid: decorative progress maps that distract or fail on mobile.
- Local artifact idea: a multi-step onboarding or compliance review flow with task status scanning; the source-backed note now lives in `govuk-task-list-flow.md`.
- acceptance gate: verify statuses read as status, not buttons; verify each question page asks one clear thing.

### Stripe API reference

- Extract: persistent navigation, API object hierarchy, code sample density, concise reference headings, and developer-first scanning.
- Avoid: copying brand visuals or overloading non-developer pages with code-panel density.
- Local artifact idea: a local plugin/API docs fixture with endpoint navigation and code examples; the source-backed note now lives in `stripe-api-reference.md`.
- acceptance gate: verify small-screen navigation, code block overflow, copy button focus state, and page-level anchor behavior.

### Tremor charts and dashboards

- Extract: KPI-to-chart rhythm, chart variant decision points, clean card hierarchy, and compact analytics defaults.
- Avoid: using chart components as a substitute for information architecture.
- Local artifact idea: a chart gallery fixture that maps common metrics to line, area, bar, donut, tracker, and bar-list patterns; the source-backed note now lives in `tremor-chart-dashboard.md`.
- acceptance gate: verify chart labels remain legible at 390 px and that every chart has a textual summary.

## Promotion Path

1. Select one candidate and define the page type it will strengthen.
2. Capture desktop and mobile evidence from the public source or official demo.
3. Write a full case note using the existing OCMacro case structure.
4. Add or update a synthetic local fixture only if the pattern needs runnable validation.
5. Add tests that prove the case is discoverable from the case library and reference bank.
6. Run visual QA for any new fixture.
7. Sync the installed `$frontend-design-boost` skill only after the repo draft and tests are green.
