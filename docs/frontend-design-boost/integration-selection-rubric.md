# Frontend Design Boost Integration Selection Rubric

Use this rubric after reading `integration-candidate-shortlist.md`. It helps you decide whether a candidate should become a full case note, a synthetic fixture, a QA gate, a runtime dependency proposal, or be rejected or deferred.

## Scoring Axes

Score each axis from 0 to 3:

- Product fit
- Pattern gap covered
- Implementation cost
- Dependency risk
- Accessibility risk
- Visual QA value
- Source maturity
- Copy / brand risk

### Score Guide

- 0: not a fit or too risky
- 1: weak fit, mostly inspiration only
- 2: useful and plausible with clear constraints
- 3: strong fit and likely worth promoting

## Integration Mode Decision

Use the highest-confidence mode that the score supports:

### Promote to full case note

Use when the candidate:

- scores high on product fit and pattern gap;
- has stable public sources;
- does not require a new dependency just to teach the pattern;
- would help future HTML, React, or Tailwind work immediately.

### Synthetic fixture

Use when the candidate:

- needs rendered QA, not just written guidance;
- has meaningful states or overflow behavior;
- can be represented with synthetic data and repo-native code.

### QA gate

Use when the candidate:

- improves repeatable validation more than visual composition;
- is best expressed as a script, checklist, or automated gate;
- does not need a whole fixture to teach the lesson.

### Runtime dependency proposal

Use when the candidate:

- solves a real product gap;
- has acceptable license and bundle cost;
- needs component behavior that repo-native code would reimplement poorly;
- can be justified with a clear migration and rollback path.

### Reject or defer

Use when the candidate:

- overlaps too much with a stronger existing local pattern;
- would introduce dependency or brand risk without enough upside;
- is interesting but not yet tied to a concrete repo task;
- is inspiration only for now.

## Candidate Scorecard Template

```text
Candidate:
Source:
Target page type:
Primary local gap:
Product fit:
Pattern gap covered:
Implementation cost:
Dependency risk:
Accessibility risk:
Visual QA value:
Source maturity:
Copy / brand risk:
Recommended mode:
Recommended next artifact:
Notes:
```

## Review Steps

1. Pick one candidate from the shortlist.
2. Fill in the scorecard.
3. Decide the lightest valid integration mode.
4. Write the next local artifact.
5. Add or update tests so the candidate stays discoverable.
6. If a dependency is proposed, stop and review license, bundle size, and fallback path before touching runtime code.

## Recommended Next Artifact Types

- `case-library/<case>.md` for source-backed pattern learning.
- `fixtures/frontend-design-boost/<fixture>.html` for rendered QA.
- `scripts/<name>.mjs` for a QA gate or verifier.
- `docs/frontend-design-boost/<name>.md` for an inspiration intake rubric or decision memo.
- `package.json` scripts only after the case is validated and the dependency decision is approved.
