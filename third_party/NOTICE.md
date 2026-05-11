# Third-Party Notice

Tracked upstream projects:

- `guizang-ppt-skill`: https://github.com/op7418/guizang-ppt-skill
  - License: MIT License, Copyright (c) 2026 op7418.
  - Vendored files:
    - `third_party/guizang-ppt-skill/LICENSE`
    - `third_party/guizang-ppt-skill/assets/template.html`
    - `third_party/guizang-ppt-skill/assets/motion.min.js`
  - Upstream commit used for Swiss Style B assets: f6676c3f315e4cbf8abb41daa26377688a716a5f
  - Additional vendored Swiss files:
    - `third_party/guizang-ppt-skill/assets/template-swiss.html`
    - `third_party/guizang-ppt-skill/scripts/validate-swiss-deck.mjs`
    - `third_party/guizang-ppt-skill/references/layouts-swiss.md`
    - `third_party/guizang-ppt-skill/references/themes-swiss.md`
    - `third_party/guizang-ppt-skill/references/swiss-layout-lock.md`
  - Local adaptation: the renderer injects deckgen contract slides, deck metadata, and theme overrides at render time; it also strips the upstream Lucide CDN script so the generated deck stays local-first.
- `ppt-master`: https://github.com/hugohe3/ppt-master
