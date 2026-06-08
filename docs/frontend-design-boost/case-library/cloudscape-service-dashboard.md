# Case: Cloudscape Service Dashboard

Sources:

- https://cloudscape.design/demos/overview
- https://cloudscape.design/patterns/general/service-dashboard/
- https://cloudscape.design/patterns/general/filter-patterns/
- https://cloudscape.design/patterns/general/filter-patterns/saved-filter-sets/
- https://cloudscape.design/patterns/resource-management/view/

Tags: `enterprise-console`, `resource-collection`, `filtering`, `table-card-toggle`, `cloud-dashboard`, `stateful-table`

This is a source-backed case note for learning from the public Cloudscape service dashboard and resource-management patterns. It is not a fixture and does not copy Cloudscape screenshots, AWS identity, component code, or example data. Use it to strengthen enterprise console, resource collection, and filtering behavior in future HTML, React, and Tailwind tasks.

## Page Type

- Type: enterprise service console and resource operations dashboard.
- Audience: operators, admins, analysts, and technical users who monitor resources, investigate status, and take action.
- Primary job: help users see service health, find the right resource subset, compare rows or cards, and act without losing state.
- Density target: high but controlled. The interface should be scan-first, not decorative.

## Source Evidence

Observed source-level lessons from the public Cloudscape pages:

- Service dashboards are framed around at-a-glance service and resource status, with users monitoring information and acting quickly.
- Dashboard patterns separate static dashboards, configurable dashboards, and dashboard items. Cloudscape also warns against mixing static and configurable layouts in one dashboard.
- Service dashboard objectives cluster around monitoring, investigating, and being informed.
- Resource view patterns distinguish table view, card view, and split view for resource collections.
- The table view is suited to larger resource collections, shared metadata, comparison, sorting, and column scanning.
- The card view is suited to smaller sets, different metadata, and visual or non-columnar resource summaries.
- Filtering patterns let users find specific resources by exact values or finite sets of properties.
- The property filter supports property values, free text, and operators; saved filter sets reduce repetitive filtering work and preserve user control.

The useful lesson is operational depth: Cloudscape treats dashboard widgets, resource views, filtering, persistence, and action surfaces as one workflow, not as isolated cards.

## Information Architecture

Use this case when a dashboard needs:

1. Service navigation.
2. Page header with primary action and utility actions.
3. Status or flashbar area for operational feedback.
4. Dashboard items for health, cost, queue, alert, or setup state.
5. Resource collection with property filter.
6. View controls for table and card views when the data warrants both.
7. Collection preferences, pagination, sorting, selection, and bulk actions.
8. Optional split panel or details region for investigation without full context loss.

This sequence fits cloud resources, internal operations, inventory tools, portfolio monitors, support queues, and financial watchlists with real row-level work.

## Layout Breakdown

- Keep the app shell quiet: persistent navigation, page title, contextual help, and primary actions should support the workflow without turning into marketing chrome.
- Put high-level service status before resource details so users know whether to monitor, investigate, or act.
- Treat dashboard items as self-contained operational modules. Each item should answer a concrete user need, such as health status, cost summary, failed jobs, or resources needing action.
- Keep collection controls adjacent to the collection they affect: filter, saved filter set, view switch, preferences, pagination, and bulk actions should read as one surface.
- Use cards for resource summaries only when cards improve recognition or visual comparison. Use tables when users compare shared metadata across many resources.
- If both table and card views exist, preserve filters, sorting intent, selection rules, and result counts across the switch.

Reusable layout skeleton:

```text
ServiceShell
  SideNavigation
  Content
    PageHeader
    FlashbarOrStatus
    DashboardItemsGrid
    ResourceCollectionToolbar
      SavedFilterSet
      PropertyFilter
      ViewToggle
      Preferences
      Actions
    TableView | CardView
    Pagination
    OptionalSplitView
```

## Component Ownership

Use this ownership map for React or structured HTML work:

- `ServiceShell`: navigation, layout regions, help affordances, page density.
- `PageHeader`: title, description, primary action, secondary actions.
- `DashboardItems`: status cards, trend cards, onboarding or cost widgets.
- `PropertyFilter`: query tokens, property definitions, operators, empty query state.
- `SavedFilterSets`: user-defined/default filters, unsaved changes, save/update/delete confirmation.
- `ResourceCollection`: row/card model, total count, sorting, pagination, preferences.
- `ViewToggle`: table and card views, responsive fallback, state preservation.
- `BulkActions`: selection, enabled/disabled rules, destructive confirmation, feedback.
- `SplitDetails`: contextual resource details without forcing a full page transition.

Do not collapse these responsibilities into anonymous cards. The case is useful because it forces dashboard and collection logic to stay explicit.

## Visual System

- Use a restrained enterprise console palette: neutral surfaces, strong body text, thin dividers, and status color only where state changes.
- Keep card and panel radius within the pack default of 8 px or less.
- Avoid large hero type, ornamental gradients, oversized icons, and decorative empty space.
- Use compact controls, but preserve target size and visible focus rings.
- Favor dense alignment: labels, counts, filters, and actions should line up predictably.

## Interaction Model

Expected interaction surfaces:

- Property filter with token add, edit, remove, clear, and zero-results state.
- Saved filter sets with default, unsaved, save, update, delete, and confirmation states.
- Table sorting, pagination, column visibility, row selection, row actions, and bulk actions.
- Card view selection or item action behavior if card view is supported.
- View switch between table and card views without losing filter context.
- Loading, refreshing, empty, zero-results, error, disabled, and permission-limited states.
- Optional URL persistence for shareable collection views when one collection owns the page.

For local use, the property filter should operate on the full resource collection conceptually, not only on visible rows in the first viewport.

## Mobile Adaptation

- Collapse side navigation into a drawer or menu while preserving service context.
- Keep the page header compact and move secondary actions into a menu when needed.
- Stack dashboard items before the collection, but do not let cards consume the whole first viewport if the collection is the primary job.
- Prefer card view for small-screen resource inspection when table columns would become unreadable.
- If a table remains necessary, use a controlled horizontal scroller, sticky first column only when tested, and a textual summary of active filters and result count.
- Preserve filters, saved filter set status, result count, and primary actions above the collection.

## QA Findings And Risks

- Source-backed strength: Cloudscape provides a coherent mental model for service dashboards, resource collections, filter persistence, and table/card view selection.
- Source-backed risk: importing Cloudscape components is a product decision, not a design shortcut. Do not add dependencies without explicit approval.
- Brand risk: do not copy AWS console styling, screenshots, icons, example resource names, or page copy.
- Density risk: enterprise controls can become cramped. Verify target size, focus, wrapping, and mobile action menus.
- Filter risk: property filters and saved filter sets need clear empty, zero-results, unsaved, invalid, and delete-confirmation states.
- Collection risk: table and card views must represent the same resource collection; avoid divergent data, lost selection, or mismatched counts.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before promoting this to a runnable fixture.

## Reusable Patterns

- Service dashboard as monitor, investigate, and inform surface.
- Static versus configurable dashboard decision before layout work starts.
- Dashboard items as self-contained operational modules.
- Resource collection toolbar combining saved filters, property filter, view controls, preferences, and actions.
- Table view for large comparable collections; card view for smaller or visually distinct resources.
- Split view for investigation workflows that need contextual details.
- URL or saved-filter persistence only when the collection ownership is clear.

## Local Application Guidance

Use this case when building:

- admin or cloud-like consoles;
- internal resource managers;
- financial watchlists with many comparable records;
- support queues, incident boards, or compliance worklists;
- dashboards where filtering, saved views, and row-level action matter more than presentation flair.

Do not use this case when:

- the page is a marketing landing page;
- the dashboard is a static executive report with no resource collection;
- the table has only a few display-only rows;
- the repo already has a stronger local collection pattern that should be followed first.

Prompt seed for future work:

```text
Use the Cloudscape service dashboard case as an enterprise console reference: service shell, status dashboard items, property filter, saved filter sets, table and card views, collection preferences, and complete loading/empty/error/zero-results states. Do not import Cloudscape or copy AWS visuals without approval. Preserve resource collection state across view changes and verify desktop/mobile screenshots.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Decide whether the target page needs a static dashboard, configurable dashboard, resource collection, or a combination of dashboard plus collection.
2. Confirm whether table view, card view, or both are justified by the resource count and metadata shape.
3. Define the property filter fields, operators, saved filter behavior, and zero-results state before styling.
4. Verify filters conceptually apply to the full collection, not only the rendered page.
5. Verify table and card views preserve filter context, result count, pagination intent, and selected-resource rules.
6. Capture desktop and mobile screenshots and check target size, focus rings, wrapping, and controlled overflow.
