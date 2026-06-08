# Case: Tremor Chart Dashboard

Sources:

- https://www.tremor.so/
- https://tremor.so/charts
- https://npm.tremor.so/

Tags: `analytics-dashboard`, `chart-cards`, `kpi-rhythm`, `chart-selection`, `react-tailwind`, `recharts`, `radix-ui`

This is a source-backed case note for learning from Tremor's public chart and dashboard component references. It is not a fixture and does not copy Tremor examples, code, branding, or chart data. Use it to strengthen analytics dashboards, KPI cards, and chart selection discipline in future HTML, React, and Tailwind work.

## Page Type

- Type: chart-led analytics dashboard.
- Audience: operators, analysts, founders, product teams, and internal users scanning metric movement.
- Primary job: pair KPIs with the right visual form so the user can compare, spot change, and decide what to inspect next.
- Density target: medium-high. The page should be chart-rich but still scan-first.

## Source Evidence

Observed source-level lessons from the public Tremor pages:

- Tremor presents 35+ fully open-source components for React and Tailwind CSS.
- The chart gallery frames chart components around real-world situations rather than abstract widgets.
- The public library stack highlights Tailwind CSS, Recharts, and Radix UI as underlying technologies.
- The chart set includes common dashboard visuals such as line, area, bar, donut, bar list, and tracker-style components.
- The useful pattern is KPI-to-chart rhythm: metric summary, trend or comparison chart, and a short textual interpretation should work together.

The useful lesson is chart fit. Do not choose a chart because it looks polished; choose it because the metric shape, comparison task, and viewport support it.

## Information Architecture

Use this case when a dashboard needs:

1. Top metric summary.
2. Small set of priority KPIs.
3. Chart cards matched to metric type.
4. Compact textual reading of each chart.
5. Secondary breakdown or ranked list.
6. Empty/loading/error states for every chart.
7. Mobile fallbacks for labels and legends.

This sequence fits SaaS analytics, portfolio snapshots, operations reports, growth dashboards, and KPI monitoring pages.

## Layout Breakdown

- Start with the primary KPI cluster before deep charts.
- Pair each major chart with a compact text summary so meaning survives when labels compress.
- Use line or area charts for time-series movement.
- Use bars for discrete comparison.
- Use donut charts only when part-to-whole reading is limited and labels stay legible.
- Use bar lists for ranked entities.
- Use tracker-like strips for compact status over time.
- Keep chart cards aligned and predictable; do not turn every card into a unique poster.

Reusable layout skeleton:

```text
AnalyticsDashboard
  Header
    Title
    TimeRange
    PrimaryAction?
  KpiCards
  ChartGrid
    TrendChartCard
    ComparisonChartCard
    DistributionChartCard
  RankedListOrTracker
  StatePanels
```

## Component Ownership

Use this ownership map for React or structured HTML work:

- `DashboardHeader`: title, time range, filters, export/action controls.
- `KpiCards`: metric value, delta, sparkline or compact status.
- `TrendChartCard`: line or area chart, legend, date range, textual summary.
- `ComparisonChartCard`: bar chart or bar list, ranked values, hover/focus state.
- `DistributionChartCard`: donut or categorical chart only when labels remain readable.
- `Tracker`: compact state or activity sequence.
- `ChartState`: loading, empty, no-data, error, and unavailable states.

Do not flatten charts into decorative cards. The value of the case is matching chart type to user question.

## Visual System

- Use restrained surfaces and clear chart contrast.
- Keep card radius within the pack default of 8 px or less unless the repo already differs.
- Avoid one-hue dashboards where every chart uses the same blue or purple family.
- Keep axis labels, legends, values, and tooltips readable at target viewports.
- Let one or two accent colors carry meaning; avoid ornamental gradients.

## Interaction Model

Expected interaction surfaces:

- Time-range selection.
- Chart hover/focus tooltip.
- Legend toggles when appropriate.
- Filtered or highlighted series.
- Export or copy action if the target product expects it.
- Loading, empty, no-data, error, disabled, and unavailable states.
- Textual fallback for charts when values or labels are hidden.

For local use, every chart card should answer a specific analytical question and include a non-visual summary.

## Mobile Adaptation

- Stack KPI cards and chart cards.
- Keep the primary metric and chart title visible before the canvas.
- Simplify legends and move long labels below the chart.
- Reduce chart density rather than shrinking labels into illegibility.
- Replace complex multi-series charts with summary text or a focused mobile variant when needed.
- Verify chart labels, tooltips, and hit targets at 390 px.

## QA Findings And Risks

- Source-backed strength: Tremor is useful for chart taxonomy and React/Tailwind dashboard component rhythm.
- Source-backed risk: charts can look polished while answering the wrong question.
- Dependency risk: do not add Tremor, Recharts, Radix UI, or Tailwind dependencies without explicit approval.
- Chart risk: every chart needs labels, summaries, and empty/loading/error states.
- Mobile risk: legends, axis labels, and tooltips can fail at 390 px even when the card layout reflows.
- Color risk: avoid one-note palettes and ensure chart color carries meaning.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- KPI-to-chart rhythm.
- Chart type chosen by metric shape.
- Compact textual interpretation beside or under each chart.
- Ranked list or tracker as a secondary analytical surface.
- Chart state handling as a first-class requirement.
- React/Tailwind component discipline without dependency creep.

## Local Application Guidance

Use this case when building:

- SaaS analytics dashboards;
- financial chart cards;
- portfolio or risk snapshots;
- growth, product, support, or operations metric pages;
- chart galleries that need clear chart-type decisions.

Do not use this case when:

- the page is not chart-led;
- the user needs a resource table more than a metric surface;
- the repo already has a stronger chart component system that should be followed first.

Prompt seed for future work:

```text
Use the Tremor chart dashboard case as a chart-led analytics reference: KPI-to-chart rhythm, chart cards, chart type selection, Tailwind/Recharts/Radix-inspired component discipline, textual chart summaries, and complete loading/empty/error states. Do not add Tremor or other dependencies without approval. Verify labels, legends, tooltips, colors, and mobile chart readability.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Define the analytical question for every chart before selecting the chart type.
2. Map each metric to line, area, bar, donut, bar list, tracker, or table with a clear reason.
3. Provide a textual summary for every chart card.
4. Verify loading, empty, no-data, error, and unavailable states.
5. Verify mobile chart labels, legends, tooltips, and hit targets.
6. Capture desktop and mobile screenshots and check chart readability, color meaning, and overflow.
