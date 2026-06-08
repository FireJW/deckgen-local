# Case: Elastic EUI Data Grid

Sources:

- https://eui.elastic.co/docs/components/data-grid/
- https://eui.elastic.co/docs/components/data-grid/style-and-display/
- https://eui.elastic.co/docs/components/tabular-content/data-grid/schema-and-columns/

Tags: `observability`, `dense-table`, `schema-driven`, `sorting`, `control-columns`, `toolbar`, `truncation`, `popovers`

This is a source-backed case note for learning from Elastic EUI data grid patterns. It is not a fixture and does not copy Elastic screenshots, code, iconography, or example data. Use it to strengthen dense table UX, schema control, and overflow handling in future HTML, React, and Tailwind tasks.

## Page Type

- Type: dense operational data grid.
- Audience: operators, analysts, and technical users who compare many fields across many rows.
- Primary job: make a wide, schema-driven table readable enough to sort, scan, filter, and inspect without losing precision.
- Density target: very high, but still controlled. This is a work surface, not a data dump.

## Source Evidence

Observed source-level lessons from the public EUI docs:

- The data grid is for rows and columns with more than simple table behavior.
- It is useful when the surface needs many columns, schema-driven configuration, and richer interaction than a plain table.
- The docs emphasize styling and display decisions, including how rows, cells, and density should behave.
- Schema and column guidance matters because the grid is defined by data shape as much as by content.
- The docs support control columns, toolbar-driven actions, schemas and sorting, and column-oriented interactions.
- Long content needs truncation or popovers so the grid stays legible.

The useful lesson is data-shape discipline: this pattern is not about making every table fancier. It is for grids where schema, density, and overflow need explicit control.

## Information Architecture

Use this case when the page needs:

1. Title and summary.
2. Toolbar with search or global actions.
3. Schema or column controls.
4. Sort and visibility controls.
5. Dense data grid body.
6. Control columns or row action columns.
7. Pagination or infinite loading.
8. Popover or detail affordances for truncated values.

This sequence fits observability, financial exposure, compliance, inventory, and other high-column-count work surfaces.

## Layout Breakdown

- Keep the toolbar above the grid so the user can understand the active schema and controls before scanning rows.
- Use column visibility and control columns to manage visual load rather than hiding important data behind arbitrary truncation.
- Keep row height and cell display choices explicit. The grid should feel intentional, not cramped by default.
- Use popovers or inline detail affordances for long values that still need to be inspectable.
- Keep table actions close to the data so the user can re-sort or adjust the schema without breaking flow.

Reusable layout skeleton:

```text
Page
  Header
    Title
    Summary
    Toolbar
      Search
      SchemaControls
      Sort
      ViewControls
  DataGrid
    ControlColumns
    DataColumns
    RowActions
    TruncatedCellsWithPopovers
  PaginationOrInfiniteLoad
```

## Component Ownership

Use this ownership map for React or structured HTML work:

- `Header`: title, summary, scope.
- `Toolbar`: search, schema controls, view controls, actions.
- `SchemaControls`: column selection, density choice, column setup, saved column layout if needed.
- `DataGrid`: row and column rendering, sorting, selection, pagination, loading and error states.
- `ControlColumns`: row selection, row status, row actions.
- `CellOverflow`: truncation, tooltip, popover, or drill-in behavior for long values.

Do not flatten this into a generic table with ad hoc controls. The value of the pattern is explicit data-shape control.

## Visual System

- Use a strict grid rhythm, compact spacing, and high-contrast body text.
- Let the data dominate the screen; avoid decorative framing or loose card spacing.
- Keep row heights stable so users can compare at speed.
- Use visual emphasis sparingly and only for state, not decoration.
- Preserve small, readable controls and visible focus rings.

## Interaction Model

Expected interaction surfaces:

- Column sorting.
- Column visibility and schema changes.
- Selection and control columns.
- Toolbar actions.
- Loading, empty, no-results, error, and disabled states.
- Truncation with popovers or detail reveal for long cell content.
- Pagination or continuous load behavior.

For local use, the grid should remain meaningful when columns are hidden or collapsed and should not lose context when detail popovers appear.

## Mobile Adaptation

- Compress the toolbar into a stacked or overflow pattern.
- Reduce visible columns aggressively and keep control columns purposeful.
- Prefer a cardified or stacked-row fallback if the data becomes unreadable at mobile width.
- If the grid remains, use controlled horizontal scroll and preserve key identifiers.
- Keep popovers or details reachable without making the page impossible to scan.

## QA Findings And Risks

- Source-backed strength: EUI makes schema, density, and overflow part of the design problem instead of an afterthought.
- Source-backed risk: a data grid can become unreadable if too many columns survive mobile unchanged.
- Brand risk: do not copy Elastic visuals or code without approval.
- Density risk: the grid can become too cramped or too wide. Validate row height, cell truncation, and focus behavior.
- Overflow risk: long values need a clear disclosure path via popovers or detail reveal.
- Control risk: schema changes and control columns must not break sorting or selection state.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- Schema-driven table configuration.
- Dense multi-column comparison.
- Control columns for selection and actions.
- Toolbar-first grid management.
- Popover-backed long-cell inspection.
- Data-grid styling that treats density as a deliberate choice.

## Local Application Guidance

Use this case when building:

- observability tables;
- financial exposure or risk grids;
- admin tables with many fields;
- technical list pages where schema control matters more than ornament;
- any surface where a plain table is too weak but a dashboard card layout is too loose.

Do not use this case when:

- the data is sparse or mostly decorative;
- the page is marketing or editorial;
- the repo already has a simpler list pattern that clearly fits better.

Prompt seed for future work:

```text
Use the Elastic EUI data grid case as a dense-table reference: schema-driven grid, toolbar, control columns, sorting, truncation, popovers, and stable row height. Do not copy Elastic visuals or add dependencies without approval. Keep the grid readable on mobile with an intentional fallback or controlled overflow.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Decide whether the surface truly needs a data grid instead of a simpler table or list.
2. Define the schema, visible columns, control columns, and sort behavior before styling.
3. Verify long cell content has a disclosure path via truncation plus popover or detail reveal.
4. Verify selection, sorting, and toolbar actions remain coherent when columns are hidden or rearranged.
5. Verify the mobile fallback or overflow strategy keeps the grid understandable.
6. Capture desktop and mobile screenshots and check row height, focus, and horizontal behavior.
