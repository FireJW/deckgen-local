# Case: Shopify Resource Index

Sources:

- https://polaris-react.shopify.com/patterns/resource-index-layout
- https://polaris-react.shopify.com/components/lists/resource-list
- https://polaris-react.shopify.com/components/selection-and-input/index-filters
- https://polaris-react.shopify.com/components/selection-and-input/filters
- https://polaris-react.shopify.com/patterns/resource-details-layout

Tags: `merchant-admin`, `resource-index`, `resource-list`, `index-filters`, `bulk-actions`, `saved-views`, `pagination`, `details-panel`

This is a source-backed case note for learning from Shopify Polaris resource index patterns. It is not a fixture and does not copy Polaris screenshots, code, icons, or merchant data. Use it to strengthen admin and merchant resource flows in future HTML, React, and Tailwind work.

## Page Type

- Type: merchant/admin resource index.
- Audience: merchants, operators, and support staff who need to find, sort, filter, and act on business objects.
- Primary job: organize resource objects, let users scan the list, and let them take action without losing their place.
- Density target: medium-high. The page should feel busy enough to support work, but not crowded enough to hide actions.

## Source Evidence

Observed source-level lessons from the public Polaris docs:

- The resource index layout is a single-column pattern that creates a clear top-to-bottom hierarchy and gives horizontal space to resource data.
- The page title and page-level actions live at the top of the index.
- Filters, sorting, and multi-select actions sit above the list so they act on the collection as a whole.
- The main body shows the individual resource objects to view or manage.
- The index filters pattern combines search, sort, filters, and saved views for index table data.
- New views can be created from the tab list or by editing filters, query, or sort and saving the result as a new view.
- Filters are a composite component for list or table data, including resource lists and data tables.
- Polaris explicitly warns to consider small screen sizes when designing each filter and the total number of filters.
- The resource details layout is typically paired with the resource index layout, which makes it a natural pattern for drill-in workflows.

The useful lesson is merchant workflow: the page is not just a table. It is a list-management surface with saved views, fast search, actionability, and a follow-up details path.

## Information Architecture

Use this case when the page needs:

1. Resource title and page-level action.
2. Compact summary or status at the top.
3. Saved views / tabs for recurring subsets.
4. Search and filter controls.
5. Sort control.
6. Multi-select and bulk actions.
7. Resource list or table body.
8. Optional details panel or full-page resource details link.

This sequence fits products, orders, customers, support tickets, inventory items, watchlist objects, and admin queues.

## Layout Breakdown

- Keep the layout single-column and work-focused.
- Place the resource title at the page top, with the primary create action in the top-right region when applicable.
- Keep filter, search, sort, and saved-view controls directly above the resource body.
- Use a resource list when the row shape is more identity-oriented or card-like; use an index table when users need to compare shared fields.
- Use a details panel or follow-on layout when the collection needs drill-in context without losing the list state.
- Keep the visible page width normal unless the data density clearly demands full width.

Reusable layout skeleton:

```text
Page
  PageHeader
    Title
    PrimaryAction
    SecondaryActions
  SummaryOrStatus
  IndexFilters
    SavedViewsTabs
    SearchField
    SortControl
    FilterControls
  ResourceCollection
    ResourceList | IndexTable
    BulkActions
    Pagination
  ResourceDetailsPanel?
```

## Component Ownership

Use this ownership map for React or structured HTML work:

- `PageHeader`: title, primary create action, page-level controls.
- `SummaryOrStatus`: count, health, or queue state.
- `SavedViewsTabs`: saved views, rename, duplicate, delete, lock rules.
- `IndexFilters`: search, filters, sort, view management, unsaved state.
- `ResourceList`: item identity, secondary metadata, selection, row actions.
- `IndexTable`: columns, sorting, pagination, bulk selection, row actions.
- `BulkActions`: selected count, destructive confirmation, enabled/disabled state.
- `ResourceDetailsPanel`: drill-in content, related actions, close behavior.

Do not flatten these roles into one generic card. The case is valuable because it keeps merchant work stateful and explicit.

## Visual System

- Use a restrained admin palette with clear contrast and strong divider rhythm.
- Prefer normal-width content with enough horizontal space for filter chips, status text, and metadata.
- Let heavier visual weight go to action rows, list dividers, and top-level state rather than decoration.
- Keep radii small and focus rings visible.
- Use chip and badge treatments only when they clarify state.

## Interaction Model

Expected interaction surfaces:

- Search, filter, and sort.
- Saved view create, rename, duplicate, delete, and lock behavior.
- Multi-select and bulk actions.
- Row actions and item-level navigation.
- Loading, empty, no-results, disabled, and error states.
- Optional details panel close/open behavior.
- Filter counts and selection counts that persist while the list changes.

For local use, the filter and saved-view state should describe the full collection conceptually, not just the currently rendered screen.

## Mobile Adaptation

- Collapse secondary filters into a drawer, sheet, or disclosure sequence when needed.
- Preserve the page title, primary action, and active view at the top.
- Keep a short summary of active filters and selection count visible.
- Prefer resource-list rows or compact cards on very small screens when the index table would lose meaning.
- Keep bulk actions reachable without hiding the current selection.
- If the table remains, use controlled horizontal scroll and stable row affordances.

## QA Findings And Risks

- Source-backed strength: Polaris gives a clean merchant mental model for resource organization and action-taking.
- Source-backed risk: the page depends on view state, not just visual chrome. Saved views and filter state must work together.
- Brand risk: do not copy Polaris visuals, merchant examples, or component code without approval.
- Density risk: too many filters or saved views can become cramped on mobile. Keep the filter count intentional.
- Selection risk: bulk actions must reflect the current selection and clear state changes cleanly.
- Details risk: if a details panel is used, it must not discard the index state or selection context.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- Single-column resource index layout.
- Page-level create action plus collection-level filters.
- Saved views and index filters as the core control surface.
- Resource list when identity is primary; index table when column comparison is primary.
- Multi-select and bulk actions at the collection level.
- Details layout paired with index layout for drill-in workflows.

## Local Application Guidance

Use this case when building:

- merchant or admin resources;
- customer, order, inventory, or support lists;
- list-first tools with saved views and bulk operations;
- work surfaces where filtering and scanning matter more than decorative structure.

Do not use this case when:

- the page is a marketing landing page;
- the data set is too small for index behavior to matter;
- the repo already has a stronger local admin list pattern that should be followed first.

Prompt seed for future work:

```text
Use the Shopify resource index case as a merchant/admin reference: single-column resource index layout, page-level action, saved views, index filters, resource list or table, multi-select, bulk actions, and paired details layout. Do not copy Polaris visuals or add dependencies without approval. Preserve saved views, filter state, and selection counts across small-screen adaptations.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Decide whether the page is list-first, table-first, or details-first.
2. Define saved views, search, filter, and sort behavior before styling.
3. Decide whether a resource list or index table is the better primary body.
4. Verify multi-select, selection count, and bulk actions reflect the full collection state.
5. Verify the page still works on small screens with a controlled filter and action layout.
6. Capture desktop and mobile screenshots and verify focus, wrapping, and no-loss state transitions.
