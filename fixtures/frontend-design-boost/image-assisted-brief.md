# Image Assisted Frontend Brief

Product: Frontend Design Boost image prompt pack

Page type: operational design workflow

Audience:

- frontend designers
- React and Tailwind implementers
- reviewers who need repeatable visual direction before implementation

Primary action:

- generate and compare bitmap visual direction sets
- extract a reusable asset direction
- keep implementation and QA separate from image generation

Required outputs:

- 3 visual directions for the same frontend concept
- 2 project-bound bitmap asset prompts
- one extraction checklist
- one screenshot QA checklist

Design constraints:

- quiet, utilitarian, scan-first
- no landing-page boilerplate
- no purple-blue gradient abuse
- no fake data-heavy UI text
- leave safe space for overlaid copy

Model route:

- `gpt-image-2` through the local `ccswitch` configuration when available
- no dependency installation
- no runtime asset generation in this brief file itself

Avoid:

- deterministic icons or vector systems
- final copy validation
- accessibility replacement
- layout correctness replacement

Success means the prompt pack makes it easy to move from brief to prompt to asset selection to screenshot QA without rethinking the workflow each time.
