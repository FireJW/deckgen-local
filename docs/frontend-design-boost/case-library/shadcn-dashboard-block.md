# Case: shadcn/ui Dashboard Block

Source: https://v3.shadcn.com/blocks

Tags: `react-tailwind`, `app-shell`, `sidebar`, `chart-card`, `data-table`, `component-ownership`

This is a source-backed case note for learning from the public shadcn/ui dashboard block. It is not a fixture and does not copy screenshots, data, or project-specific code. Treat the source as a component-structure reference for future React/Tailwind dashboards.

## Page Type

- Type: React/Tailwind product dashboard block.
- Audience: developers building an app shell with metrics, charts, and a data table.
- Primary job: provide a copy-owned starting point that can become a repo-native dashboard.
- Density target: medium. The block is app-like and operational, but it stays lighter than an enterprise console.

## Source Evidence

Observed source-level structure from the public block page:

- `dashboard-01` is presented as a sidebar dashboard with charts and a data table.
- The file list separates shell, chart, table, section cards, and header concerns: `AppSidebar`, chart component, `DataTable`, `SectionCards`, and `SiteHeader`.
- The page composition wraps the dashboard in a sidebar provider, renders `AppSidebar`, then stacks header, cards, chart, and table in the content area.
- A collapsed sidebar variant keeps icon-level navigation available.

The useful lesson is component ownership: the block is not just a visual screenshot. It is an app-shell composition with clear files that map to UI responsibilities.

## Information Architecture

The block is organized as:

1. Persistent app shell.
2. Sidebar navigation.
3. Site header.
4. Summary section cards.
5. Interactive chart area.
6. Data table.

This sequence is a strong default for operational dashboards where users need to orient, scan headline state, inspect a trend, then act on rows.

## Layout Breakdown

- The sidebar carries product navigation without consuming the primary content column.
- The header stays inside the content shell, so page actions and breadcrumbs remain close to the current workspace.
- Summary cards sit above the chart/table because they establish current state before detail inspection.
- The chart and table are separate components, not decorative content inside one generic card.
- The data table is the final dense surface, which matches the scan-to-investigate flow.

Reusable layout skeleton:

```text
SidebarProvider
  AppSidebar
  Main content
    SiteHeader
    SectionCards
    ChartAreaInteractive
    DataTable
```

## Component Ownership

Use this case when a local implementation needs clear component boundaries:

- `AppSidebar`: navigation state, labels, icons, collapse behavior.
- `SiteHeader`: page title, breadcrumbs, primary actions, utility controls.
- `SectionCards`: metric cards and first-glance state.
- `ChartAreaInteractive`: trend surface, filters, tooltips, summaries.
- `DataTable`: row model, sorting, filtering, selection, row actions, empty/loading/error states.

Do not flatten all of these into one generated HTML blob when the target is React. The value of this case is the ownership model.

## Visual System

- The visual language is component-system-led: restrained cards, small radii, quiet borders, and chart color used as data accent.
- The block uses density without turning the page into a spreadsheet first.
- It is appropriate for SaaS operations, internal tools, finance dashboards, support consoles, and admin surfaces.
- It is not a landing-page model. Do not add hero copy, oversized headings, or decorative gradients.

## Interaction Model

Expected interaction surfaces:

- Sidebar collapse and navigation state.
- Header actions.
- Chart hover and filter state.
- Table sorting, filtering, row selection, pagination, row actions.
- Loading, empty, disabled, and error states for every data surface.

For local use, treat these as requirements rather than optional polish.

## Mobile Adaptation

This case needs a stricter mobile plan than the desktop block suggests:

- Collapse the sidebar into a drawer, menu, or top action.
- Keep summary cards first, but reduce them to one column.
- Keep the chart visible, with a textual summary if labels become too dense.
- Make the table either horizontally controlled, cardified with clear row actions, or split into a focused mobile list.
- Preserve tappable controls and visible focus rings.

## QA Findings And Risks

- Source-backed strength: the block exposes component boundaries and dashboard composition clearly.
- Source-backed risk: copy/paste block code can hide whether the target repo actually wants shadcn, TanStack table, Recharts, or the same file layout.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before promoting this to a fixture or using it as a visual baseline.
- Dependency risk: do not add dependencies without explicit approval.
- Table risk: verify sorting, filtering, selection, empty, loading, and error state behavior.

## Reusable Patterns

- App shell plus sidebar for dashboards that have many sections.
- Header inside the app shell, not a marketing nav.
- Summary cards before chart/table detail.
- Chart plus table pairing for operational scan and investigation.
- File-level component ownership as a design discipline.
- Collapsed sidebar as a desktop density tool and a mobile simplification cue.

## Local Application Guidance

Use this case when building:

- React/Tailwind dashboards;
- SaaS or admin consoles;
- support, billing, finance, or portfolio operation pages;
- product UIs that need metrics, trend analysis, and row-level action in one screen.

Do not use this case when:

- the page is editorial or report-first;
- the user asked for a marketing landing page;
- the table is not central to the workflow;
- the repo already has a dashboard shell and table model that should be followed instead.

Prompt seed for future work:

```text
Use the shadcn dashboard block case as a structural reference: app shell, sidebar, site header, summary cards, interactive chart, and data table with clear component ownership. Do not copy code blindly or add dependencies without approval. Keep repo-native styling, visible focus states, mobile sidebar behavior, and complete table states.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Confirm the target repo accepts shadcn-style components or map the pattern to existing local components.
2. Decide whether the table should use TanStack-style behavior, repo-native table helpers, or static HTML.
3. Capture desktop and mobile screenshots for the target implementation.
4. Verify no horizontal table overflow on 390 px unless there is an intentional controlled scroller.
5. Verify sidebar/drawer focus behavior, table selection state, and chart textual fallback.
