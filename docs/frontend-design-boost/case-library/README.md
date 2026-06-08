# Frontend Design Boost Case Library

Use these case notes as pattern references for future HTML, React, and Tailwind work.
They are design analyses, not asset packs: copy the structure, interaction logic, and QA lessons, not external screenshots, brand marks, or private data.

## Cases

| Case | Tags | Use When |
| --- | --- | --- |
| `ocmacro-trump-dashboard.md` | `research-dashboard`, `chart-led`, `event-log`, `mobile-hierarchy` | Macro, market, policy, or risk pages need stacked chart cards, narrative event logs, and a compact mobile adaptation. |
| `shadcn-dashboard-block.md` | `react-tailwind`, `app-shell`, `sidebar`, `chart-card`, `data-table`, `component-ownership` | React/Tailwind dashboards need a clean app shell, sidebar, summary cards, chart/table pairing, and clear component ownership. |
| `cloudscape-service-dashboard.md` | `enterprise-console`, `resource-collection`, `filtering`, `table-card-toggle`, `cloud-dashboard`, `stateful-table` | Enterprise dashboards need service status, property filters, saved views, table and card views, and complete collection states. |
| `shopify-resource-index.md` | `merchant-admin`, `resource-index`, `resource-list`, `index-filters`, `bulk-actions`, `saved-views` | Merchant/admin resource pages need a single-column index, saved views, search, filters, bulk actions, and a paired details path. |
| `elastic-eui-data-grid.md` | `observability`, `dense-table`, `schema-driven`, `sorting`, `control-columns`, `toolbar` | Dense data surfaces need schema-driven columns, toolbar control, truncation, and popovers without losing scanability. |
| `govuk-task-list-flow.md` | `public-service`, `task-list`, `question-pages`, `status-scanning`, `form-flow`, `accessibility` | Long transactional flows need task status scanning, one-question pages, Back link / Continue navigation, and accessible validation. |
| `stripe-api-reference.md` | `developer-docs`, `api-reference`, `object-hierarchy`, `code-examples`, `endpoint-navigation`, `copy-actions` | Developer references need resource navigation, endpoint headers, parameters, returns, code examples, and copy/LLM export actions. |
| `tremor-chart-dashboard.md` | `analytics-dashboard`, `chart-cards`, `kpi-rhythm`, `chart-selection`, `react-tailwind`, `recharts` | Chart-led dashboards need KPI-to-chart rhythm, chart type discipline, textual summaries, and complete chart states. |
| `ant-design-pro-admin.md` | `enterprise-admin`, `form-table`, `protable`, `query-form`, `drawer-form`, `editable-records` | Enterprise admin screens need query forms, dense tables, batch actions, drawer/modal editing, validation, and explicit dependency gates. |
| `mui-x-data-grid.md` | `react`, `data-grid`, `dense-table`, `sorting`, `filtering`, `editing`, `virtualization` | React data-grid pages need sorting, filtering, pagination, editing, column controls, keyboard behavior, license-tier checks, and mobile fallback. |

## Candidate Backlog

- `candidate-backlog.md` - source-backed candidates for future full case notes and local fixtures.

## How To Use

1. Match the case to the page type before borrowing from it.
2. Extract reusable patterns into the local design preflight: information architecture, component strategy, token choices, responsive behavior, and QA risks.
3. Keep repo-native components and accessibility gates first.
4. Re-capture screenshots for the target implementation instead of relying on the reference case.
