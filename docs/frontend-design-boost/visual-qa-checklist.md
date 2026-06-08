# Frontend Design Boost Visual QA Checklist

## Required Screenshots

Capture at least:

- Desktop: 1440 x 900
- Mobile: 390 x 844

Add tablet when layout shifts materially around medium widths.

## What To Check

### Layout

- The page is not blank.
- The first viewport is framed correctly.
- Headline, body, and controls do not collide.
- Sections do not feel randomly stacked.
- Cards are not nested inside cards unless the design truly needs it.

### Typography

- Text stays inside its container.
- Long labels wrap cleanly.
- Headlines do not dominate compact panels.
- Body copy stays readable at the chosen width.

### Density

- Dashboards are dense enough to be useful.
- Marketing pages are not overpacked.
- Editorial pages keep breathing room without wasting space.
- The chosen density matches the page type.

### Color and Shape

- Blue or purple gradients are not the default answer.
- Corners are not oversized by habit.
- The page does not collapse into one color family.
- Surfaces and borders have clear separation.

### Content Reality

- Real visual assets are present when the task needs them.
- Placeholder art is not pretending to be product evidence.
- Charts, tables, or screenshots look like actual content, not decoration.
- Empty states exist when the content can be absent.

### Interaction States

- Hover state exists.
- Focus state exists.
- Active state exists where relevant.
- Loading state exists where relevant.
- Empty state exists where relevant.
- Error state exists where relevant.

### Accessibility Basics

- Controls remain visible and understandable.
- Focus indicators are not removed.
- Focus appearance is visible, not clipped, and easy to track from the screenshot.
- Contrast is strong enough for body text and controls.
- Interactive elements are obviously interactive.
- Pointer targets are at least 24 by 24 CSS pixels or have equivalent spacing.
- Disclosure controls are keyboard-reachable and clearly show collapsed versus expanded state.

## Hard Failures

Fail the review if any of these are true:

- Text overflows visibly
- Mobile layout overlaps
- Hero section is empty or hollow
- Page uses decorative gradients instead of structure
- Cards are stacked inside cards for no reason
- Theme is flat and monochrome with no hierarchy
- Dashboard density is wrong for the content
- Hover or focus states are missing
- Focus appearance is invisible, clipped, or ambiguous
- Pointer targets are smaller than 24 x 24 CSS pixels without equivalent spacing
- Empty, loading, or error states are missing where needed

## Review Loop

1. Capture desktop screenshot.
2. Capture mobile screenshot.
3. Compare the screenshots against the intended page type.
4. Fix any overflow, overlap, or hierarchy failure.
5. Re-capture screenshots.
6. Stop only when the page looks intentional on both sizes.

## Deckgen Local Notes

For deckgen-local HTML output, use the existing visual-smoke command family and verify against the generated run bundle.
For the standalone boost demo fixture, run `npm.cmd run qa:frontend-design-boost`.
If local auto-detection fails, pass `--module-dir` or `--browser-executable` explicitly.
For other repos, use the local browser or Playwright setup already available in that repo.
