# Case: OCMacro Trump Dashboard

Source: https://ocmacro.com/dashboard/trump

Tags: `research-dashboard`, `chart-led`, `event-log`, `mobile-hierarchy`

Local evidence from the review pass:

- `.tmp/site-analysis/ocmacro-trump/desktop-1440x900.png`
- `.tmp/site-analysis/ocmacro-trump/mobile-390x844.png`
- `.tmp/site-analysis/ocmacro-trump/analysis-report.json`

This note is for local learning only. Do not copy the site's screenshots, brand marks, chart artwork, or data. Reuse the design patterns and verify the target implementation with fresh screenshots.

## Page Type

- Type: public macro research dashboard.
- Audience: readers tracking policy, market pressure, and event context.
- Primary job: make the latest signal legible quickly, then let the reader inspect history and supporting events.
- Density target: medium-high. The page is chart-led and evidence-heavy, but the surrounding chrome stays restrained.

## Information Architecture

The page uses a simple hierarchy:

1. Global brand/header with a narrow utility row, active navigation, theme toggle, and login control.
2. Local page header with a compact breadcrumb/title and one-line scope statement.
3. A stacked main content flow:
   - Trump Pressure Index card.
   - Collapsed TACO event log.
   - Approval Tracker card with segmented tabs.
   - Truth Social Monitor card with lazy-loaded lower-priority content.

The strongest idea is not the specific political subject; it is the pairing of a quantified chart with a short narrative log. That makes the chart feel explainable instead of ornamental.

## Local Study Cards

Use this case as four reusable learning cards:

1. Top bar and navigation organization: brand, utility controls, active section, and menu collapse stay quiet so the chart can lead.
2. Single-page multi-section information architecture: one page can hold several analytical blocks when every block repeats the same eyebrow, title, summary, chart, and source-footer rhythm.
3. Chart plus event-log narrative: model event notes as threat, drawdown, and meaning so policy or market moves become explainable instead of just annotated.
4. Mobile first-view conclusion: keep the same hierarchy on mobile, but compress navigation and preserve the first chart, headline metric, and conclusion before lower-priority details.

## Layout Breakdown

- The desktop layout is a centered, wide single column. It avoids a sidebar and gives charts enough horizontal room.
- Cards are large, shallow, and separated by whitespace rather than heavy shadows.
- Each analytical block follows a repeatable skeleton: eyebrow, title, one-line explanation, chart or primary content, source/footer/actions.
- The first chart dominates the first viewport. This is appropriate because the page's value proposition is the pressure index itself.
- The approval section uses tabs inside the card, keeping related chart modes in one bounded analytical surface.
- The Truth Social monitor is lower in the stack and visually quieter. It is treated as supporting context, not equal-weight first-screen content.

Reusable layout skeleton:

```text
Header
  brand | nav | utilities
Page scope bar
  breadcrumb/title | short purpose
Main
  Research card
    eyebrow
    title
    summary
    headline metric or gauge
    annotated chart
    source footer and actions
    collapsed narrative log
  Research card
    eyebrow
    title
    segmented tabs
    annotated chart
  Supporting monitor card
    eyebrow
    title
    lazy content region
```

## Visual System

- Palette: off-white page background, black body text, quiet gray metadata, thin beige-gray borders, and chart accents in red, teal, blue, and gold.
- Shape: card corners stay restrained and close to the boost pack's 8 px limit.
- Borders do more work than shadows. This keeps the dashboard editorial and serious.
- Typography uses strong contrast between uppercase English eyebrows and bold Chinese titles. For local reuse, keep the eyebrow small and avoid turning every label into tracked uppercase text.
- Chart bands use tinted zones to explain state ranges before the reader studies the line. This is a useful pattern for thresholds, risk regimes, and severity bands.

## Interaction Model

- Global navigation uses an active underline and a hamburger affordance.
- Dark mode toggle and login stay in the top utility area.
- The first card exposes export actions for PNG and source data.
- The event log is collapsed by default, preserving chart priority while keeping narrative depth one click away.
- The approval tracker uses segmented tabs for different cuts of the same data surface.
- The lower monitor area uses lazy loading, reducing first-screen weight.

For local implementations, add or verify:

- visible `:focus-visible` treatment for nav, tabs, exports, and disclosure controls;
- 24 x 24 CSS px minimum pointer targets or equivalent spacing;
- semantic tabs/disclosure behavior instead of div-only click targets;
- loading, empty, and error states for chart data and lazy monitors.

## Mobile Adaptation

The 390 x 844 capture keeps the same hierarchy instead of replacing the dashboard with a separate mobile page:

- brand and utility controls stay compact at the top;
- the nav compresses into a horizontal strip plus hamburger;
- the local page scope remains visible before the first card;
- the metric gauge moves above the chart;
- cards become a single column with enough padding to keep the chart readable;
- tabs are still visible as a single segmented row;
- the supporting monitor remains below the primary charts.

The mobile version is useful because it proves dense research dashboards do not need a marketing-style mobile rewrite. They need clear ordering, controlled overflow, and smaller but still meaningful chart surfaces.

## QA Findings From The Capture

- The body width stayed aligned to the viewport in the captured desktop and mobile screenshots.
- The desktop navigation strip reported internal horizontal overflow in the DOM report. Treat this as a caution: use a controlled scroll strip, overflow fade, or menu collapse rather than letting nav links escape.
- Hidden export-chart SVG assets appeared as offscreen overflow candidates in the report. Local QA should distinguish intentional offscreen export canvases from visible layout overflow.
- Mobile chart labels remain dense. If our local task has heavier labels, provide a summary metric, a simplified mobile chart, or a details disclosure below the chart.

## Reusable Patterns

- Research dashboard shell: quiet global chrome, strong local scope bar, stacked analytical cards.
- Eyebrow-title-summary rhythm: makes repeated sections scannable without decorative cards inside cards.
- Chart plus event log: combine quantitative state with a compact story layer; for risk or policy topics, structure the log as threat, drawdown, and meaning.
- Threshold bands: put the interpretation scale inside the chart, not only in surrounding copy.
- Segmented chart modes: keep alternate cuts of one dataset in the same card.
- Lazy supporting feed: defer lower-priority feeds until they are near the viewport.
- Mobile hierarchy preservation: keep the same analytical order and compress controls instead of hiding the core chart.

## Local Application Guidance

Use this case when building:

- market, policy, portfolio, or research dashboards;
- chart-led single-page reports;
- operational monitors where a signal needs an event trail;
- compact public dashboards that need to feel serious rather than app-like.

Do not use this case when:

- the task is a marketing landing page;
- the user needs a CRUD admin panel with heavy row actions;
- the chart is decorative instead of the product;
- the repo already has a stronger dashboard system to follow.

Prompt seed for future work:

```text
Use the OCMacro research-dashboard case as a structural reference: quiet global chrome, local scope bar, stacked analytical cards, eyebrow-title-summary rhythm, chart plus event-log pairing, restrained borders, and mobile hierarchy preservation. Do not copy assets or data. Keep repo-native components, accessible tabs/disclosures, visible focus states, and screenshot QA at 1440x900 and 390x844.
```
