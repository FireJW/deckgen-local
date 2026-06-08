# Codex Frontend Design Boost Prompt

Use this prompt when you need Codex to build or revise a webpage, HTML page, React UI, or Tailwind interface.

You are improving a real frontend, not making a generic pretty mockup.

Before implementation, do this:

1. Identify the page type.
2. State the user action and audience.
3. Decide whether the UI should be operational, editorial, marketing, social, or report-like.
4. Choose the lightest design system that fits the repo.
5. Define spacing, radius, type, color, and surface tokens.
6. Collect at least one real visual reference or component reference.
7. Call out the page's required states and edge cases.
8. Reject weak layouts before coding them.

Source-backed defaults:

- For operational dashboards, first try: summary metrics, prioritized action list, data table or grid, trend block, and visible state area.
- For table-heavy UI, use table semantics, row actions, and column behavior before turning everything into cards.
- For dense details, use semantic disclosure or APG-aligned expand/collapse behavior.
- For custom controls, prefer accessible primitives such as shadcn/ui or Radix-derived patterns already accepted by the repo.
- For chart-led research dashboards, check the local case library before inventing a new section model.
- For current external design methods, use the reference bank or `deep-research-dag` before committing to the layout.

Hard rules:

- Do not overuse blue or purple gradients.
- Do not nest cards inside cards.
- Do not use oversized corner radii.
- Do not let text overflow or overlap.
- Do not ship a mobile layout that collapses or stacks badly.
- Do not use an empty hero section when the task needs a real first viewport.
- Do not use decorative imagery where the task needs real product or data visuals.
- Do not flatten the page into a monochrome wall.
- Do not use landing-page tropes for dashboards or operational tools.
- Do not ignore hover, focus, loading, empty, or error states.

Design rules:

- Make the first viewport honest about the product.
- Keep hierarchy obvious.
- Keep density appropriate for the page type.
- Use component patterns that already fit the repo.
- Prefer shadcn/ui and Tailwind for common product UI work.
- Use Magic UI or motion only when the task benefits from it.
- Use React Bits only when the interaction pattern is genuinely useful.
- Treat screenshot-to-code, Magic MCP, and similar tools as reference sources, not runtime dependencies.

Execution rules:

- Read the existing repo structure first.
- Follow the repo's native design tokens and component patterns.
- Build the smallest version that still feels finished.
- Verify on desktop and mobile screenshots.
- Fix overflow, overlap, and missing states before declaring success.

Verification rules:

- Desktop screenshot looks balanced and readable.
- Mobile screenshot keeps hierarchy and interaction intact.
- Text fits inside its containers.
- No obvious overlap, clipping, or layout collapse.
- Focus appearance is visible.
- Pointer targets meet the 24 x 24 CSS pixel minimum or have equivalent spacing.
- Empty, loading, focus, hover, and error states exist where needed.

Output format:

- State the page type.
- State the component strategy.
- State the token choices.
- State the references used.
- State the hard risks you are avoiding.
- State the screenshots or visual checks you ran.
- State what changed if you had to fix any layout problem.

Skill draft:

```text
name: frontend-design-boost
description: Use before building HTML, web, React, or Tailwind UI to enforce page-type classification, token discipline, reference-based design, anti-pattern checks, and screenshot QA.
```

