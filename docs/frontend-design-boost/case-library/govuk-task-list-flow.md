# Case: GOV.UK Task List Flow

Sources:

- https://design-system.service.gov.uk/components/task-list/
- https://design-system.service.gov.uk/patterns/question-pages/

Tags: `public-service`, `task-list`, `question-pages`, `status-scanning`, `form-flow`, `accessibility`

This is a source-backed case note for learning from GOV.UK Design System task list and question page patterns. It is not a fixture and does not copy GOV.UK copy, service examples, or visual assets. Use it to strengthen long transactional flows, status scanning, and form-page discipline in future HTML, React, and Tailwind work.

## Page Type

- Type: long transactional task flow.
- Audience: users completing a service, application, onboarding, review, or compliance workflow.
- Primary job: show which tasks are available, blocked, incomplete, or done, then ask one clear question at a time.
- Density target: medium. The flow should be content-first and highly scannable, not dashboard-like.

## Source Evidence

Observed source-level lessons from the public GOV.UK docs:

- Task lists are intended for long, complex services where users need to understand and complete multiple tasks.
- The task list is built around task names plus task status, so progress can be scanned without decorative progress maps.
- Task lists can group related tasks when a service has enough steps to need structure.
- Question pages should ask one question per page.
- A question page typically uses a Back link near the top and a Continue button after the input.
- GOV.UK patterns keep page hierarchy and labels explicit so users do not need to infer the workflow from visual decoration.

The useful lesson is reduction: for transactional UX, clarity beats density. Every page should tell the user what step they are on and what action is next.

## Information Architecture

Use this case when the page needs:

1. Service or flow title.
2. Optional short explanation.
3. Task groups or task list.
4. Task rows with link text and task status.
5. Question pages that ask one thing.
6. Back link, input, hint/error text, and Continue.
7. Review or confirmation step after the task sequence.

This sequence fits onboarding, compliance review, account setup, application flows, internal approval flows, and workflow checklists.

## Layout Breakdown

- Keep the task list plain and readable. Each row should expose the task name and current status.
- Use grouped task lists only when grouping improves scanning.
- Avoid decorative cards around every step. The content and status labels carry the structure.
- On question pages, put the Back link before the main content and the Continue action after the question input.
- Keep the H1 aligned with the current question or task, not with a generic page title.
- Move details into hints or supporting text only when they help answer the question.

Reusable layout skeleton:

```text
TaskListPage
  ServiceHeading
  IntroText?
  TaskList
    Section?
      TaskNameLink
      TaskStatus

QuestionPage
  BackLink
  Form
    QuestionHeading
    Hint?
    ErrorSummary?
    Input
    Continue
```

## Component Ownership

Use this ownership map for React or structured HTML work:

- `TaskListPage`: flow title, service state, task grouping.
- `TaskList`: ordered task rows and section headings.
- `TaskRow`: task link, task status, unavailable/blocked state.
- `QuestionPage`: Back link, H1, form structure, Continue.
- `FieldControl`: label, hint, error, validation state.
- `ReviewStep`: check answers, edit links, final submission.

Do not flatten this into a visual timeline or card wall. The case works because it is simple enough to be understood immediately.

## Visual System

- Use high-contrast text, strong heading hierarchy, and clear status labels.
- Keep spacing generous enough for readability, but not so loose that task scanning breaks.
- Avoid gradients, illustrations, icon-heavy progress, and marketing-style hero sections.
- Use status text and simple tags instead of decorative progress widgets.
- Keep buttons and links visually familiar and keyboard-friendly.

## Interaction Model

Expected interaction surfaces:

- Task link opens the relevant question or subflow.
- Task status communicates incomplete, complete, blocked, or not yet started state.
- Back link returns to the previous step or expected parent context.
- Continue validates the current page and moves forward.
- Error summary, field error, disabled/unavailable task, loading, and confirmation states.
- Edit links from review pages return to the exact question.

For local use, task status must be meaningful text, not only color or icon. Status must not behave like a button unless it is also an action.

## Mobile Adaptation

- Stack task name and task status when horizontal room is tight.
- Keep task rows tappable without turning the whole list into oversized cards.
- Keep Back link, H1, input, and Continue in predictable order.
- Make error summaries visible before the field that failed validation.
- Avoid sticky footers unless the target product already uses them accessibly.

## QA Findings And Risks

- Source-backed strength: GOV.UK is excellent for low-flair, high-clarity transactional UX.
- Source-backed risk: the pattern can look too plain if copied visually without understanding the service flow. The value is flow clarity, not the exact skin.
- Brand risk: do not copy GOV.UK service copy, Crown identity, or government-specific styling.
- Status risk: task status must be perceivable and not rely on color alone.
- Flow risk: question pages should not ask multiple unrelated questions just to reduce page count.
- Mobile risk: task status can wrap awkwardly if row spacing and label length are not tested.
- Screenshot evidence: pending. Capture desktop and mobile screenshots before using this as a runnable fixture baseline.

## Reusable Patterns

- Task list for long, complex services.
- Status scanning without decorative progress maps.
- One question per page.
- Back link plus Continue as predictable transactional navigation.
- Review step with edit links after the task sequence.
- Accessible validation hierarchy with error summary and field error.

## Local Application Guidance

Use this case when building:

- onboarding flows;
- compliance or review workflows;
- application forms;
- internal approval task lists;
- complex setup experiences where users can complete tasks in different orders.

Do not use this case when:

- the page is a dashboard;
- the workflow is only one short form;
- a compact wizard or modal is already a better repo-native pattern;
- the user needs data comparison rather than task completion.

Prompt seed for future work:

```text
Use the GOV.UK task list case as a transactional-flow reference: task list, task status, grouped steps, one question per page, Back link, Continue, and accessible validation. Do not copy GOV.UK branding or page copy. Keep the flow plain, status-readable, mobile-safe, and focused on the next user action.
```

## acceptance gate

Before this case is used as implementation guidance:

1. Confirm the flow is long or complex enough to need a task list.
2. Define every task status and whether blocked tasks are links, text, or disabled actions.
3. Verify each question page asks one question per page unless the questions are tightly related.
4. Verify Back link and Continue behavior for every step.
5. Verify validation uses both an error summary and field-level errors when appropriate.
6. Capture desktop and mobile screenshots and check task status wrapping, focus order, and tap targets.
