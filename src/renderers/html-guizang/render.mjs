const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const stableClassPart = (value, fallback) => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const THEME_PRESETS = {
  'ink-classic': {
    ink: '#0a0a0b',
    inkRgb: '10,10,11',
    paper: '#f1efea',
    paperRgb: '241,239,234',
    paperTint: '#e8e5de',
    inkTint: '#18181a'
  },
  'indigo-porcelain': {
    ink: '#0a1f3d',
    inkRgb: '10,31,61',
    paper: '#f1f3f5',
    paperRgb: '241,243,245',
    paperTint: '#e4e8ec',
    inkTint: '#152a4a'
  },
  'forest-ink': {
    ink: '#1a2e1f',
    inkRgb: '26,46,31',
    paper: '#f5f1e8',
    paperRgb: '245,241,232',
    paperTint: '#ece7da',
    inkTint: '#253d2c'
  },
  'kraft-paper': {
    ink: '#2a1e13',
    inkRgb: '42,30,19',
    paper: '#eedfc7',
    paperRgb: '238,223,199',
    paperTint: '#e0d0b6',
    inkTint: '#3a2a1d'
  },
  dune: {
    ink: '#1f1a14',
    inkRgb: '31,26,20',
    paper: '#f0e6d2',
    paperRgb: '240,230,210',
    paperTint: '#e3d7bf',
    inkTint: '#2d2620'
  }
};

const THEME_ALIASES = {
  default: 'ink-classic',
  monocle: 'ink-classic',
  ink: 'ink-classic',
  classic: 'ink-classic',
  indigo: 'indigo-porcelain',
  porcelain: 'indigo-porcelain',
  forest: 'forest-ink',
  kraft: 'kraft-paper',
  paper: 'kraft-paper',
  sand: 'dune'
};

const resolveTheme = (rendererHint) => {
  const key = stableClassPart(rendererHint, 'ink-classic');
  const themeKey = THEME_PRESETS[key] ? key : THEME_ALIASES[key] ?? 'ink-classic';

  return {
    key: themeKey,
    vars: THEME_PRESETS[themeKey]
  };
};

const renderThemeVars = (vars) => [
  `--ink:${vars.ink};`,
  `--ink-rgb:${vars.inkRgb};`,
  `--paper:${vars.paper};`,
  `--paper-rgb:${vars.paperRgb};`,
  `--paper-tint:${vars.paperTint};`,
  `--ink-tint:${vars.inkTint};`
].join('');

const renderBody = (body) => {
  if (typeof body !== 'string' || body.length === 0) {
    return '';
  }

  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replaceAll('\n', '<br>')}</p>`)
    .join('\n');

  return `<div class="slide-body">\n${paragraphs}\n</div>`;
};

const renderSlide = (slide, index) => {
  const id = stableClassPart(slide.id, `slide-${index + 1}`);
  const role = stableClassPart(slide.role, 'content');
  const layout = stableClassPart(slide.layout_intent, 'default');
  const surface = role === 'cover' || layout === 'hero-dark' || layout === 'quote'
    ? 'surface-ink'
    : 'surface-paper';
  const label = String(index + 1).padStart(2, '0');

  return [
    `<section id="${escapeHtml(id)}" class="slide slide-${escapeHtml(role)} layout-${escapeHtml(layout)} ${surface}" data-slide-index="${index}" data-role="${escapeHtml(role)}" data-layout="${escapeHtml(layout)}">`,
    `  <div class="slide-kicker">${escapeHtml(label)} / ${escapeHtml(role)}</div>`,
    '  <div class="slide-copy">',
    `    <h2>${escapeHtml(slide.headline)}</h2>`,
    renderBody(slide.body),
    '  </div>',
    '</section>'
  ].filter(Boolean).join('\n');
};

const renderDots = (slides) => slides
  .map((slide, index) => `<button type="button" class="deck-dot" data-slide-dot="${index}" aria-label="Go to slide ${index + 1}"></button>`)
  .join('\n');

export function renderHtmlDeck(contract) {
  const title = contract?.title ?? 'Deck';
  const theme = resolveTheme(contract?.theme?.renderer_hint);
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: "Noto Sans SC", Inter, "Segoe UI", Arial, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; overflow: hidden; background: var(--paper); color: var(--ink); }
    .deck { ${renderThemeVars(theme.vars)} min-height: 100vh; background: var(--paper); color: var(--ink); }
    .slide-track { height: 100vh; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: none; }
    .slide-track::-webkit-scrollbar { display: none; }
    .slide { position: relative; flex: 0 0 100vw; min-height: 100vh; padding: 64px min(8vw, 96px); display: grid; align-content: center; gap: 30px; scroll-snap-align: start; }
    .surface-paper { background: linear-gradient(135deg, var(--paper) 0%, var(--paper-tint) 100%); color: var(--ink); }
    .surface-ink { background: radial-gradient(circle at 85% 15%, rgba(var(--paper-rgb), 0.18), transparent 34%), var(--ink); color: var(--paper); }
    .slide-kicker { display: inline-block; justify-self: start; font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace; font-size: 0.78rem; letter-spacing: 0; text-transform: uppercase; opacity: 0.72; }
    .slide-copy { max-width: 1060px; display: grid; gap: 28px; }
    .slide h2 { margin: 0; max-width: 1040px; font-family: "Noto Serif SC", "Songti SC", Georgia, serif; font-size: clamp(2.35rem, 7vw, 6.2rem); line-height: 1.02; letter-spacing: 0; overflow-wrap: anywhere; }
    .slide-body { display: grid; gap: 18px; max-width: 820px; }
    .slide p { margin: 0; font-size: 1.16rem; line-height: 1.72; overflow-wrap: anywhere; }
    .slide-evidence .slide-copy, .slide-content .slide-copy { grid-template-columns: minmax(0, 1fr); }
    .slide-content:not(.layout-text-split) .slide-copy, .slide-evidence .slide-copy { align-content: center; }
    .slide-content:not(.layout-text-split) h2, .slide-evidence h2 { font-size: clamp(2rem, 5vw, 4.6rem); line-height: 1.08; }
    .layout-text-split .slide-copy { max-width: 1180px; grid-template-columns: minmax(0, 0.78fr) minmax(0, 1fr); align-items: start; column-gap: min(6vw, 84px); }
    .layout-text-split h2 { max-width: none; font-size: clamp(2rem, 4.2vw, 4rem); line-height: 1.08; }
    .layout-text-split .slide-body { max-width: none; padding-left: min(4vw, 48px); border-left: 1px solid rgba(var(--ink-rgb), 0.24); }
    .deck-nav { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); display: flex; gap: 10px; padding: 8px 10px; border: 1px solid rgba(var(--ink-rgb), 0.18); background: rgba(var(--paper-rgb), 0.78); backdrop-filter: blur(16px); }
    .deck-dot { width: 10px; height: 10px; padding: 0; border: 1px solid rgba(var(--ink-rgb), 0.42); border-radius: 999px; background: transparent; cursor: pointer; }
    .deck-dot[data-active="true"] { background: var(--ink); border-color: var(--ink); }
    .surface-ink + .deck-nav, .deck-nav { color: var(--ink); }
    @media (max-width: 720px) {
      .slide { padding: 48px 24px 80px; }
      .slide h2 { font-size: clamp(2.1rem, 15vw, 4.2rem); }
      .slide p { font-size: 1rem; line-height: 1.62; }
      .layout-text-split .slide-copy { grid-template-columns: minmax(0, 1fr); }
      .layout-text-split .slide-body { padding-left: 0; border-left: 0; }
    }
  </style>
</head>
<body>
<main class="deck theme-${escapeHtml(theme.key)}" data-renderer="html-guizang" data-guizang-theme="${escapeHtml(theme.key)}">
  <div class="slide-track" data-slide-track>
${slides.map(renderSlide).join('\n')}
  </div>
  <nav class="deck-nav" aria-label="Slide navigation">
${renderDots(slides)}
  </nav>
</main>
<script>
(() => {
  const track = document.querySelector('[data-slide-track]');
  const dots = Array.from(document.querySelectorAll('[data-slide-dot]'));
  if (!track || dots.length === 0) return;

  const setActive = (index) => {
    dots.forEach((dot, dotIndex) => {
      dot.dataset.active = String(dotIndex === index);
    });
  };

  const goTo = (index) => {
    const slide = track.querySelector(\`[data-slide-index="\${index}"]\`);
    if (slide) slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.slideDot)));
  });

  document.addEventListener('keydown', (event) => {
    const current = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    if (event.key === 'ArrowRight') goTo(Math.min(current + 1, dots.length - 1));
    if (event.key === 'ArrowLeft') goTo(Math.max(current - 1, 0));
    if (event.key === 'Escape') goTo(0);
  });

  let animationFrame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(() => {
      setActive(Math.round(track.scrollLeft / Math.max(track.clientWidth, 1)));
    });
  }, { passive: true });

  setActive(0);
})();
</script>
</body>
</html>`;
}
