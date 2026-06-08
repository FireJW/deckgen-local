# Frontend Design Boost Integration Candidate Shortlist

Sources checked on 2026-05-27.

This shortlist is for user selection before any deeper integration. It does not approve dependency installation, copied screenshots, copied source text, or runtime adoption. Use it to decide what should become a case note, fixture, QA gate, prompt pattern, or dependency proposal.

## Selection Matrix

| Candidate | Source | Best Harvest | Suggested Integration Mode | Risk / Gate |
| --- | --- | --- | --- | --- |
| Ant Design and ProComponents | https://ant.design/ and https://procomponents.ant.design/ | Enterprise admin layout, form density, table actions, editable records, Pro-style page scaffolds. | Full case note first; synthetic admin fixture later. | Avoid importing Ant Design unless a target repo accepts its visual system and bundle impact. |
| MUI X Data Grid | https://mui.com/x/react-data-grid/ | Data grid editing, column pinning, row grouping, tree data, virtualization, and table-level affordances. | Promoted to `case-library/mui-x-data-grid.md`; dense-table fixture remains a future candidate. | License and package tier must be checked before runtime use. |
| Carbon Design System | https://carbondesignsystem.com/ | Enterprise information architecture, data table discipline, AI/product patterns, accessibility-first docs. | Case note for enterprise workflow and state language. | Avoid copying IBM visual identity; keep it as pattern extraction. |
| Microsoft Fluent 2 | https://fluent2.microsoft.design/ | Productivity UI, command bars, navigation, density, focus, Windows/M365-adjacent interaction language. | Case note for tool surfaces and command-heavy apps. | Do not use as a skin unless the app intentionally targets Fluent conventions. |
| Atlassian Design System | https://atlassian.design/ | Work management screens, issue tables, filters, inline actions, collaborative product flows. | Case note for queue and project-management UX. | Avoid copying Jira/Atlassian branding; extract workflow patterns only. |
| Salesforce Lightning Design System | https://www.lightningdesignsystem.com/ | CRM record pages, datatables, forms, density, object navigation, global actions. | Case note for CRM/admin object pages. | Strong brand identity; dependency use is usually inappropriate outside Salesforce contexts. |
| SAP Fiori | https://experience.sap.com/fiori-design-web/ | List report, object page, overview page, analytical apps, enterprise task flows. | Case note for enterprise list-report and object-page structure. | Heavy enterprise semantics; map to local domain before using. |
| Adobe Spectrum / React Aria | https://react-spectrum.adobe.com/react-aria/ | Accessible primitive behavior, collection components, keyboard patterns, cross-platform interaction semantics. | Reference-bank upgrade or accessibility gate; not necessarily a visual case. | Headless primitives still require local visual design and state QA. |
| AG Grid | https://www.ag-grid.com/ | Enterprise grid behaviors, editing, grouping, pivoting, pinned columns, large data. | Runtime-dependency proposal only after licensing review; case note first. | License, bundle weight, and complexity gate required before adoption. |
| TanStack Table | https://tanstack.com/table/latest | Headless table behavior, sorting/filtering/selection/pagination without visual lock-in. | Runtime-dependency proposal for React table behavior; compare with shadcn and repo-native tables. | Requires local accessibility and visual implementation. |
| Apache ECharts | https://echarts.apache.org/ | Large chart catalog, complex dashboards, financial/market charts, interactions. | Chart fixture candidate and possible runtime-dependency proposal. | Validate bundle size, theming, accessibility, and mobile labels. |
| Nivo | https://nivo.rocks/ | React chart gallery, chart type discovery, SVG/canvas tradeoffs. | Chart-type case note or fixture reference. | Do not use chart variety as information architecture. |
| Observable Plot | https://observablehq.com/plot/ | Grammar-like statistical charts, compact exploratory visualizations. | Research/data-report case note candidate. | Best for data visualization, not generic SaaS dashboard chrome. |
| Storybook | https://storybook.js.org/ | Component examples, isolated states, docs, interaction tests, visual review workflow. | QA gate proposal for reusable components and fixtures. | Adds project structure; only useful when component surfaces repeat. |
| Chromatic | https://www.chromatic.com/ | Hosted visual regression with Storybook. | Optional visual QA service proposal. | External service approval needed. |
| Percy | https://percy.io/ | Cross-browser screenshot diffs and visual regression. | Optional Playwright visual QA service proposal. | External service approval needed; local smoke remains default. |
| axe-core | https://github.com/dequelabs/axe-core | Automated accessibility checks and rule engine. | Local QA gate candidate for rendered fixtures. | Automated checks do not replace manual keyboard and responsive review. |
| v0 | https://v0.dev/ | AI-assisted React/Tailwind drafts, shadcn-aligned component prototypes. | Prompt/reference workflow only; compare outputs against local QA checklist. | Do not treat generated output as verified UX or production code. |
| Builder.io Visual Copilot | https://www.builder.io/c/docs/visual-copilot | Design-to-code and Figma-to-code workflow ideas. | Reference-only candidate for prompt and reconstruction discipline. | Generated code needs repo-native review and visual QA. |
| Mobbin | https://mobbin.com/ | Product pattern browsing, mobile and SaaS flows, onboarding and settings references. | Inspiration-only source list; selected examples can become case notes after review. | Do not copy screenshots, proprietary flows, or brand-specific layouts. |
| Page Flows | https://pageflows.com/ | UX flow examples and product interaction sequences. | Inspiration-only source for flow analysis. | Usually not a runtime or component source. |

## Recommended Next Promotions

1. Ant Design / ProComponents admin case.
   - Why: fills the enterprise form-table-admin gap that Cloudscape and Shopify only partly cover.
   - Local output: `case-library/ant-design-pro-admin.md`.
   - Acceptance gate: table density, edit flows, form validation, drawer/modal behavior, mobile table fallback.

2. MUI X Data Grid case.
   - Why: complements Elastic EUI and AG Grid with a widely used React grid ecosystem.
   - Local output: `case-library/mui-x-data-grid.md`.
   - Acceptance gate: license tier noted, keyboard behavior, virtualization, column controls, long-cell handling.
   - Status: promoted to source-backed case note; runnable fixture still deferred.

3. SAP Fiori list report / object page case.
   - Why: strong enterprise IA pattern for list-to-detail workflows.
   - Local output: `case-library/sap-fiori-list-report.md`.
   - Acceptance gate: list report, object page, filter bar, responsive object details, non-copying brand gate.

4. Storybook plus axe-core QA gate proposal.
   - Why: strengthens repeatable UI-state validation beyond static document guidance.
   - Local output: `docs/frontend-design-boost/qa-gate-candidates.md` or a future script plan.
   - Acceptance gate: no external service requirement; repo-native command must run locally.

5. Mobbin / Page Flows intake rubric.
   - Why: gives a disciplined way to use commercial inspiration sites without copying.
   - Local output: `docs/frontend-design-boost/inspiration-intake-rubric.md`.
   - Acceptance gate: every captured reference must name page type, workflow, interaction states, and what not to copy.

## Integration Modes

### Reference-only

Use when the external source is valuable as a design pattern but not as code. Most design systems start here.

Required local artifacts:

- source URL;
- page type;
- extraction notes;
- anti-copying warning;
- acceptance gate.

### Full case note

Use when the source fills a real gap in the local case library.

Required local artifacts:

- `docs/frontend-design-boost/case-library/<case>.md`;
- row in `case-library/README.md`;
- row or promotion update in `candidate-backlog.md`;
- entry in `reference-bank.md`;
- test coverage in `tests/frontend-design-boost-pack.test.mjs`.

### Synthetic fixture

Use when the pattern needs rendered QA, not just written guidance.

Required local artifacts:

- fixture brief;
- HTML fixture or repo-native UI fixture;
- `.states.json` if states differ by fixture;
- screenshot QA command or existing fixture QA command;
- desktop and mobile screenshot evidence.

### QA gate

Use when the candidate improves repeatable validation more than visual composition.

Possible candidates:

- Storybook for component state examples;
- axe-core for automated accessibility checks;
- Percy or Chromatic only if external services are approved;
- existing Playwright/local smoke first.

### Runtime dependency proposal

Use only after user approval.

Required decision points:

- license;
- bundle/runtime cost;
- accessibility behavior;
- compatibility with repo-native components;
- migration and rollback path;
- local visual QA command.

## Rejection Rules

- Do not add dependencies from this shortlist without explicit approval.
- Do not copy screenshots, brand assets, proprietary examples, or commercial app flows.
- Do not promote a candidate into the installed skill until repo docs and tests pass.
- Do not treat AI-generated UI as verified design.
- Do not replace local repo patterns with a design system unless the target app intentionally adopts that system.

## Suggested Selection Prompt

```text
From docs/frontend-design-boost/integration-candidate-shortlist.md, select up to 3 candidates to promote next. For each selected candidate, choose one integration mode: reference-only, full case note, synthetic fixture, QA gate, or runtime dependency proposal. Keep runtime dependencies off unless explicitly approved.
```
