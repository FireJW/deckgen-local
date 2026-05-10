# Third-Party Notice

Tracked upstream projects:

- `guizang-ppt-skill`: https://github.com/op7418/guizang-ppt-skill
  - License: MIT License, Copyright (c) 2026 op7418.
  - Vendored files:
    - `third_party/guizang-ppt-skill/LICENSE`
    - `third_party/guizang-ppt-skill/assets/template.html`
    - `third_party/guizang-ppt-skill/assets/motion.min.js`
  - Local adaptation: the renderer injects deckgen contract slides, deck metadata, and theme overrides at render time; it also strips the upstream Lucide CDN script so the generated deck stays local-first.
- `ppt-master`: https://github.com/hugohe3/ppt-master
