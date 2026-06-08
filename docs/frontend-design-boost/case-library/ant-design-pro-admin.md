# Case: Ant Design / ProComponents Admin

Source:

- https://ant.design/docs/spec/introduce
- https://ant.design/components/table
- https://ant.design/components/form
- https://ant.design/components/drawer
- https://procomponents.ant.design/components/table
- https://procomponents.ant.design/components/form
- https://procomponents.ant.design/components/layout

Tags: `enterprise-admin`, `form-table`, `protable`, `query-form`, `drawer-form`, `editable-records`, `batch-actions`

Use this case for enterprise admin, CRUD, CRM, operations, and internal tool screens where the first user job is to find, compare, edit, and confirm records.

## Page Type

Enterprise admin surface.

The useful pattern is a task-first form-table workflow:

- Query before browsing.
- Table rows carry scan-friendly state.
- Primary actions are close to the affected record.
- Batch actions are available only after selection.
- Edit and detail surfaces open without destroying list context.
- Validation and confirmation states are visible before data-changing actions.

Do not use this case for marketing pages, editorial pages, or lightweight dashboards that do not need record operations.

## Source Evidence

Ant Design positions itself around enterprise-level products and reusable interaction patterns. The component docs expose the core admin primitives this case needs:

- Table: structured records, sorting, filtering, pagination, fixed columns, expandable rows, editable rows, virtual lists, and responsive behavior.
- Form: validation, layout, field dependencies, dynamic fields, disabled state, feedback, and submit flow.
- Drawer: side-panel detail or editing surfaces that preserve page context.
- ProComponents: higher-level ProTable, ProForm, and ProLayout patterns for admin applications.

The local lesson is not to copy Ant Design's visual identity. Extract the workflow shape: query form plus dense result table plus contextual edit/detail shell.

## Information Architecture

Recommended first-screen order:

1. Page title and concise scope label.
2. Query form with the highest-yield filters only.
3. Toolbar with primary create action, batch actions, density/view controls, and refresh.
4. Data table with status, owner, timestamps, key numeric or categorical fields, and row actions.
5. Drawer or modal for create/edit/detail, preserving list state underneath.
6. Pagination, saved query, or reload feedback.

Avoid putting a large KPI hero above the query/table area unless the admin workflow truly starts with metrics.

## Layout Breakdown

### Query Form

Use a compact query form when users repeatedly filter the same resource:

- Put common filters in the first row.
- Hide advanced filters behind disclosure.
- Keep Reset and Search close to the fields.
- Preserve active filters visibly after results update.
- Represent loading, zero-results, invalid-filter, and partially applied states.

### Toolbar

Use the toolbar to separate collection-level actions from row-level actions:

- Primary create action
- Refresh or sync
- Export only when allowed
- Column visibility or density control when columns are numerous
- Batch actions disabled until rows are selected
- Selection count visible when batch mode is active

### Table

A ProTable-like table is useful when the page needs:

- Sorting, filtering, pagination, or server-side query state
- Pinned identity/status columns
- Long-cell truncation with a reveal path
- Row-level action hierarchy
- Editable records
- Expandable detail rows
- Virtualized or paginated large collections

Do not build a div grid when a semantic table is enough.

### Drawer Or Modal Editing

Use a drawer when editing should preserve the list context:

- Detail preview
- Create/edit form
- Audit or activity timeline
- Related resource summary
- Confirmation for destructive operations

Use a modal only for short, blocking decisions. Long forms and record editing usually need drawer or page-level space.

## Interaction Model

Minimum state set:

- Query: idle, dirty, submitting, invalid, reset, no results
- Table: loading, empty, error, selected rows, sorted, filtered, paginated
- Row action: hover, focus, disabled, destructive confirmation
- Editable records: unchanged, dirty, validation error, saving, saved, failed
- Drawer/form: open, close with unsaved changes, submit disabled, submit loading, server error
- Batch action: disabled, selected, confirmed, partially failed

Keyboard and focus handling are non-negotiable because admin users repeat these flows for long sessions.

## Visual System

Recommended local translation:

- Dense but readable row heights
- Radius at or below the pack default unless the repo system says otherwise
- Quiet neutral surfaces with restrained status color
- Clear active filter chips or labels
- Visible focus rings for every control
- Row actions that do not dominate scan columns
- Truncation only with tooltip, popover, detail row, or drawer reveal

Do not turn an admin tool into a card-heavy landing page.

## Mobile Adaptation

Mobile admin workflows need an explicit fallback:

- Keep query controls stacked and collapsible.
- Preserve Search and Reset near the filter fields.
- Turn wide tables into priority columns, row cards, or a details drill-in.
- Keep batch actions reachable but not visually dominant.
- Avoid horizontal table escape unless the domain explicitly requires a spreadsheet-like surface.
- Test drawer width, form labels, validation text, and sticky action bars at 390 px.

If the workflow is not practical on mobile, state the supported mobile behavior instead of pretending the desktop table simply shrinks.

## QA Findings And Risks

- Source-backed strength: Ant Design and ProComponents cover the exact admin loop of query form, table operations, drawer/modal editing, and validation.
- Source-backed risk: adopting Ant Design visually can override a repo's existing design system.
- Dependency risk: Ant Design and ProComponents are runtime dependencies; do not add them without explicit approval and bundle/style review.
- Abstraction risk: ProTable-style helpers can hide server query state, accessibility behavior, and mobile fallback details.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- Query form above table for resource lists.
- Disclosure for advanced filters.
- Toolbar with create, refresh, column/density controls, and disabled batch actions.
- Status and ownership columns early in the table.
- Row actions ordered by frequency and risk.
- Drawer edit/detail flow to preserve list context.
- Validation and unsaved-change handling as first-class states.
- Batch action failure handling, not just success.

## Local Application Guidance

Use this case when building:

- Customer, order, ticket, portfolio, lead, invoice, task, user, or permission admin pages
- Financial operations tables with edit/review workflows
- CRM object lists
- Internal review queues
- Data stewardship or approval consoles

Do not use this case when:

- The page is mostly narrative or analytical.
- A simple static table is enough.
- The target repo already has a strong component system that solves form/table/drawer behavior.
- The user has not approved new runtime dependencies.

## Local Study Cards

Use Ant Design / ProComponents as an enterprise admin reference: query form, ProTable-like result surface, toolbar actions, row actions, editable records, drawer or modal editing, validation, and batch states. Do not install Ant Design or copy its visuals without approval. Preserve repo-native styling and verify mobile table fallback.

## acceptance gate

- Official source links are recorded.
- The case is used as pattern extraction, not visual copying.
- Dependency installation remains approval-gated.
- Query, table, drawer/modal, editable, batch, loading, empty, error, disabled, and validation states are accounted for.
- Mobile table fallback is explicitly designed and screenshot-tested.
- Long-cell handling and row-action focus states are verified.
- Destructive and data-changing actions require confirmation and failure states.
