# Frontend Debug Evidence Bundle

Source: `vercel-labs/dev3000` and `vercel-labs/json-render`
Checked: 2026-06-01
Mode: local contract, no runtime dependency

## Do Not Install Wholesale

Do not install `vercel-labs/dev3000`, `d3k`, or `vercel-labs/json-render` by default. The local pack already has Browser/Playwright screenshot QA, repo-native tests, fixed Chrome guardrails, and explicit approval gates. Use this note to shape the evidence we hand to an AI agent before asking it to debug or revise a frontend surface.

## Why This Exists

`dev3000` is useful because it frames debugging as a timestamped development timeline: server logs, browser console messages, network requests, screenshots, and user interactions live together. `json-render` is useful because it makes generated UI predictable through a component catalog and action catalog. The local adoption is to combine those ideas into one reviewable artifact.

## When To Use

Use this contract when a frontend task has any of these symptoms:

- A screenshot looks wrong but the cause may be in data, routing, console errors, CSS, or async state.
- Browser/Playwright output exists, but it is scattered across terminal logs, screenshots, and ad hoc notes.
- A generated or AI-revised UI needs a clear component and action allowlist before implementation.
- A future agent needs enough context to reproduce a visual or interaction issue without reopening every tool.

## Local Bundle Schema

Use `frontend_debug_evidence_bundle/v1` as the handoff shape. Store it under a repo-local `.tmp/` or `output/` directory owned by the target repo.

```json
{
  "schema": "frontend_debug_evidence_bundle/v1",
  "target": {
    "repo": "deckgen-local",
    "surface": "frontend-design-boost",
    "app_url": "http://localhost:3000",
    "task": "fix mobile overflow in dashboard"
  },
  "run": {
    "id": "2026-06-01T06-00-00Z-dashboard-overflow",
    "captured_at": "2026-06-01T06:00:00Z",
    "commands": ["npm.cmd test", "node output/playwright/smoke.mjs"]
  },
  "component_catalog": {
    "allowed": ["Shell", "Toolbar", "DataTable", "MetricCard", "ChartPanel", "StateNotice"],
    "disallowed": ["NestedCard", "MarketingHero", "UnboundedGrid"]
  },
  "action_catalog": {
    "allowed": ["filter", "sort", "open_detail", "retry_load"],
    "requires_evidence": ["export", "delete", "submit"]
  },
  "timeline": [
    {
      "ts": "2026-06-01T06:00:05Z",
      "type": "server_log",
      "level": "info",
      "message": "dev server ready on port 3000",
      "artifact_path": ".tmp/frontend-debug/server.log"
    },
    {
      "ts": "2026-06-01T06:00:12Z",
      "type": "browser_console",
      "level": "error",
      "message": "Cannot read properties of undefined",
      "url": "http://localhost:3000/dashboard"
    },
    {
      "ts": "2026-06-01T06:00:14Z",
      "type": "network_request",
      "method": "GET",
      "url": "/api/items",
      "status": 500
    },
    {
      "ts": "2026-06-01T06:00:18Z",
      "type": "screenshot",
      "viewport": "390x844",
      "artifact_path": "output/playwright/dashboard-mobile.png",
      "finding": "table escapes viewport"
    }
  ],
  "summary": {
    "first_failure": "browser_console",
    "blocking_errors": 2,
    "suspected_area": "data table empty/error state",
    "next_action": "fix error state and rerun desktop/mobile screenshot QA"
  }
}
```

## Capture Rules

- Prefer repo-native tests and visual smoke commands first.
- Use Browser/Playwright for desktop and mobile screenshots, console evidence, and interaction snapshots.
- Put server output, browser_console entries, network_request entries, screenshots, and user interaction notes into one timeline.
- Keep screenshots as file paths; do not embed large image data in JSON.
- Add `component_catalog` before asking an AI to generate or revise UI.
- Add `action_catalog` before allowing generated controls to imply behavior.
- Record explicit unavailable evidence instead of pretending it was captured.

## Review Checklist

Before using a bundle as implementation input, check:

- Timeline is chronological and has at least one screenshot for the failing viewport.
- Each blocking browser_console or network_request item has a matching URL or artifact path.
- The component_catalog excludes page patterns forbidden by the skill, such as nested cards or marketing heroes in operational tools.
- The action_catalog separates safe local UI actions from account-changing or destructive actions.
- The summary names the first failure and a concrete rerun command.

## Local Adoption Rule

Treat this as an evidence shape and prompt discipline, not a dependency decision. If a future repo repeatedly needs live timeline capture beyond Browser/Playwright and terminal logs, evaluate a small adapter separately with tests and explicit approval.
