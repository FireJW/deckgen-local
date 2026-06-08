# Case: Stripe API Reference

Sources:

- https://docs.stripe.com/api

Tags: `developer-docs`, `api-reference`, `object-hierarchy`, `code-examples`, `endpoint-navigation`, `copy-actions`, `technical-density`

This is a source-backed case note for learning from the public Stripe API reference. It is not a fixture and does not copy Stripe page copy, examples, branding, or code snippets. Use it to strengthen API docs, plugin references, SDK guides, and developer-facing technical pages in future HTML, React, and Tailwind work.

## Page Type

- Type: developer API reference.
- Audience: developers integrating an API, SDK, plugin, or local tool.
- Primary job: help a developer find the right resource, understand parameters and return objects, copy a usable example, and recover quickly from errors.
- Density target: high. The page should be compact, navigable, and code-first without hiding conceptual structure.

## Source Evidence

Observed source-level lessons from the public Stripe docs:

- Stripe describes its API around predictable resource-oriented URLs.
- The API uses standard HTTP semantics and JSON responses, which makes endpoint structure central to the page.
- The API reference emphasizes client libraries, because examples need to map to real implementation contexts.
- The page exposes a large object hierarchy through navigable resources and operations.
- Endpoint pages pair descriptive reference content with code examples.
- The visible Copy for LLM affordance is a useful developer-doc lesson: reference pages should make copying structured context easy when the task naturally involves another tool.

The useful lesson is reference density with strong wayfinding: the page gives developers multiple routes into the same object model without turning the page into a generic article.

## Information Architecture

Use this case when a technical reference needs:

1. Persistent navigation for API groups and resources.
2. Current resource or endpoint title.
3. Short conceptual summary.
4. Request method and path.
5. Authentication, version, or environment context.
6. Parameters with type, required/optional state, and nested object structure.
7. Return object and error shape.
8. Code examples with language or client-library context.
9. Copy, open, or deep-link actions.

This sequence fits API docs, plugin command references, SDK pages, schema references, and local automation tool docs.

## Layout Breakdown

- Keep navigation persistent enough that deep endpoint pages do not feel disconnected from the object hierarchy.
- Keep method, path, and resource name close together.
- Put parameter and return sections before long narrative content when the page is reference-first.
- Place code examples next to the concept or endpoint they demonstrate.
- Use collapsible nested objects carefully; do not hide required fields.
- Provide copy actions for endpoint paths, code examples, object examples, and full-context exports when useful.

Reusable layout skeleton:

```text
ApiReferenceShell
  SideNav
    ResourceGroups
    Endpoints
  Content
    EndpointHeader
      Method
      Path
      Title
      CopyActions
    Summary
    Parameters
    Returns
    Errors
  CodeExamples
    LanguageTabs
    RequestExample
    ResponseExample
```

## Component Ownership

Use this ownership map for React or structured HTML work:

- `ApiReferenceShell`: persistent navigation, content/code layout, responsive behavior.
- `ResourceNav`: resource groups, endpoint anchors, active state, search.
- `EndpointHeader`: method, path, title, copy/deep-link actions.
- `ParameterTable`: name, type, required/optional, nested fields, constraints.
- `ReturnObject`: object hierarchy, expandable fields, example values.
- `CodeExamples`: language or client-library tabs, request and response examples.
- `CopyActions`: copy endpoint, copy code, Copy for LLM or equivalent full-context export.
- `ErrorReference`: error codes, status handling, recovery notes.

Do not flatten this into a long article. The value of the pattern is dense reference retrieval.

## Visual System

- Use strong typographic contrast between resource names, endpoint paths, parameters, and examples.
- Keep code surfaces compact but readable.
- Use monospace only where it aids scanning.
- Make active navigation state obvious.
- Avoid marketing hero composition, oversized headings, and decorative cards.
- Keep code block overflow controlled on small screens.

## Interaction Model

Expected interaction surfaces:

- Resource navigation and active section state.
- Search or quick find when the object hierarchy is large.
- Language or client-library selector.
- Copy actions for code examples, endpoint paths, and structured reference context.
- Expand/collapse for nested parameters and return objects.
- Anchor links for endpoint sections.
- Loading, empty search, unavailable version, and error states.

For local use, code examples should always be paired with enough context to understand inputs, outputs, and failure behavior.

## Mobile Adaptation

- Collapse side navigation into a drawer or section index.
- Keep method and path visible near the title.
- Stack code examples below reference content when side-by-side layout becomes cramped.
- Make code blocks horizontally scrollable with clear boundaries.
- Keep copy buttons reachable and focus-visible.
- Avoid hiding required parameter details behind collapsed sections on first view.

## QA Findings And Risks

- Source-backed strength: Stripe balances dense object hierarchy, code examples, and navigation without making the page feel like a static article.
- Source-backed risk: copy-heavy API pages can overflow quickly on mobile if code and parameter names are not constrained.
- Brand risk: do not copy Stripe branding, copy, object examples, or code snippets.
- Navigation risk: a deep endpoint page must still show its place in the hierarchy.
- Copy risk: copy buttons need focus, success, failure, and disabled states.
- Code risk: examples must be current for the chosen client libraries and should not imply unsupported SDKs.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- Persistent resource navigation.
- Endpoint header with method and path.
- Parameter and return object hierarchy.
- Side-by-side reference and code examples.
- Client-library selector.
- Copy actions, including full-context copy for tool-assisted workflows.

## Local Application Guidance

Use this case when building:

- API references;
- plugin command docs;
- SDK and CLI guides;
- local automation tool docs;
- developer-facing schema or contract pages.

Do not use this case when:

- the target page is non-technical;
- the page is conceptual education rather than reference lookup;
- code examples are not central to the user's task.

Prompt seed for future work:

```text
Use the Stripe API reference case as a developer-doc reference: persistent resource navigation, endpoint header, predictable resource-oriented URLs, object hierarchy, parameters, returns, client libraries, code examples, and Copy for LLM style context export. Do not copy Stripe visuals or code snippets. Keep code overflow controlled and copy states explicit.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Confirm the page is reference-first rather than article-first.
2. Define the resource groups, endpoint hierarchy, method/path display, and anchor behavior.
3. Define parameter, return object, error, and code example sections before styling.
4. Verify code examples match supported client libraries and do not drift from the current API.
5. Verify copy actions have focus, success, failure, and unavailable states.
6. Capture desktop and mobile screenshots and check navigation, code overflow, and object hierarchy readability.
