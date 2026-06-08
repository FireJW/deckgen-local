# Case: MUI X Data Grid

Source:

- https://mui.com/x/react-data-grid/
- https://mui.com/x/react-data-grid/sorting/
- https://mui.com/x/react-data-grid/filtering/
- https://mui.com/x/react-data-grid/pagination/
- https://mui.com/x/react-data-grid/editing/
- https://mui.com/x/react-data-grid/column-pinning/
- https://mui.com/x/react-data-grid/row-grouping/
- https://mui.com/x/react-data-grid/tree-data/
- https://mui.com/x/react-data-grid/virtualization/
- https://mui.com/x/react-data-grid/accessibility/
- https://mui.com/x/introduction/licensing/

Tags: `react`, `data-grid`, `dense-table`, `sorting`, `filtering`, `editing`, `virtualization`, `column-controls`, `license-gate`

Use this case when a React task needs a dense, interactive, record-oriented grid with built-in table behavior rather than a static table or fully custom div grid.

## Page Type

Dense data grid or operational resource table.

The useful pattern is not the MUI visual style. It is the product decision boundary:

- Use a normal semantic table for small static datasets.
- Use a headless table when the repo already owns the visual system and table controls.
- Use a batteries-included data grid when users need sorting, filtering, pagination, selection, editing, virtualization, column controls, and keyboard-oriented data manipulation.
- Treat Pro or Premium grid features as license-tier decisions before proposing a runtime dependency.

## Source Evidence

MUI X Data Grid covers structured rows and columns plus filtering, sorting, pagination, editing, virtualization, and advanced manipulation features. Its package model matters:

- Community Data Grid is the default open-source starting point.
- Pro and Premium add advanced grid behavior.
- License tier must be checked before proposing runtime use.

Local implication: always identify the required feature set and license tier before recommending MUI X as a dependency.

## Information Architecture

Recommended first-screen order:

1. Page title and resource scope.
2. Compact filter/search area or quick filter.
3. Toolbar with column controls, density, export if approved, refresh, and selected-row count.
4. Data grid with identity/status columns early, pinned actions only when needed, and explicit loading/empty/error overlays.
5. Detail drawer, side panel, or route for long records and row-level editing.
6. Pagination or server-side data feedback when row count is large.

Do not put dense-grid workflows behind a marketing-style hero. The grid is the product surface.

## Layout Breakdown

### Sorting And Filtering

Use sorting and filtering when users need repeatable scan paths:

- Preserve visible sort state in headers.
- Keep filter state visible or discoverable.
- Use server-side sorting/filtering when the dataset exceeds what is loaded locally.
- Avoid custom sorting that breaks user expectations for dates, numbers, booleans, and empty values.

### Pagination And Virtualization

Use pagination for explicit dataset boundaries and server fetches.

Use virtualization when users need fast scan over many rows or columns, but do not let performance hide usability problems:

- Row height must stay predictable.
- Keyboard focus must not disappear when rows virtualize out.
- Loading and stale-data states must remain visible.
- Screen readers and keyboard users still need coherent navigation.

### Editing

Grid editing is appropriate when users change many similar records:

- Distinguish cell editing from row editing.
- Represent dirty, validation error, saving, saved, and failed states.
- Confirm destructive edits and bulk changes.
- Keep row identity visible while editing.
- Provide a detail drawer for long or multi-section edits instead of forcing everything into cells.

### Column Controls

Column controls are useful when datasets have many fields:

- Pin only identity, status, or action columns that must stay visible.
- Let users hide low-priority columns when the task repeats.
- Treat column order, visibility, and pinned state as user preference when the app needs persistence.
- Do not pin so many columns that the scrollable region becomes useless.

## Interaction Model

Minimum state set:

- Grid: loading, empty, zero-results, error, stale, refreshing
- Columns: sorted, filtered, hidden, pinned, resized, reordered
- Rows: selected, expanded, edited, invalid, saving, failed
- Cells: hover, focus, edit, readonly, disabled, validation error
- Toolbar: disabled batch action, active filter, selected count, export unavailable
- Server-side data: pending request, failed request, retry, partial data

Keyboard behavior must be designed before implementation. Dense grids fail quickly when focus, cell entry, escape, row selection, or toolbar movement is unclear.

## Visual System

Recommended local translation:

- Compact row density only when text remains legible.
- Stronger horizontal alignment than card-based layouts.
- Clear header hierarchy and visible sort/filter affordances.
- Status color used sparingly and backed by text.
- Long-cell handling through truncation plus tooltip, popover, drawer, or expanded row.
- Row actions that stay secondary to data scanning.

Do not use decorative chart-card composition when the main job is record comparison.

## Mobile Adaptation

Mobile data grids need a deliberate fallback:

- Keep only identity, status, and one high-value metric in the first view.
- Move long fields into a details drawer or route.
- Avoid wide horizontal scrolling unless the task is genuinely spreadsheet-like.
- Keep filter/search usable above the grid.
- Do not hide selection or batch state without an alternate path.
- Test long-cell wrapping, toolbar overflow, and action menus at 390 px.

If the grid is desktop-only, state that explicitly and provide a mobile read-only or drill-in path.

## QA Findings And Risks

- Source-backed strength: MUI X Data Grid covers common dense-grid behaviors with a React-first, styled implementation.
- License tier risk: column pinning, row grouping, tree data, and other advanced behavior may require Pro or Premium. Record the license tier before proposing runtime use.
- Design-system risk: MUI visual defaults can conflict with repo-native styling.
- Abstraction risk: a grid component can hide accessibility, server-state, and mobile fallback decisions.
- Performance risk: virtualization improves scale but can create focus, measurement, and row-height edge cases.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- Grid toolbar with active filters, selection count, refresh, and column controls.
- Identity/status/action columns with disciplined pinning.
- Server-side mode when sorting, filtering, or pagination should not operate on partial data.
- Dirty-state editing with validation and save failure handling.
- Long-cell disclosure path via tooltip, popover, expanded row, or drawer.
- Mobile priority-column fallback instead of uncontrolled horizontal escape.

## Local Application Guidance

Use this case when building:

- Data-grid-heavy React pages
- Admin resource lists with many columns
- Financial, market, CRM, support, or operations tables
- Editable records with validation
- Large datasets that need pagination or virtualization

Do not use this case when:

- A plain HTML table is enough.
- The target repo is not React.
- The target repo cannot accept MUI visual/runtime dependencies.
- The needed feature requires a paid license tier that has not been approved.
- The user primarily needs a dashboard summary, not row-level manipulation.

## Local Study Cards

Use MUI X Data Grid as a dense React grid reference: sorting, filtering, pagination, editing, selection, virtualization, column controls, license tier, keyboard behavior, long-cell handling, and mobile fallback. Do not add MUI X dependencies without explicit approval. Treat Pro/Premium-only features as proposal items, not defaults.

## acceptance gate

- Official source links are recorded.
- Required feature set is mapped to Community, Pro, or Premium before dependency use.
- The case is used as pattern extraction, not visual copying.
- Sorting, filtering, pagination, editing, selection, loading, empty, error, stale, disabled, and validation states are accounted for.
- Keyboard behavior is tested for grid, toolbar, selection, and edit entry/exit.
- Long-cell handling has a visible disclosure path.
- Mobile fallback is designed and screenshot-tested.
- Runtime dependency installation remains approval-gated.
