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

const renderBody = (body) => {
  if (typeof body !== 'string' || body.length === 0) {
    return '';
  }

  return body
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replaceAll('\n', '<br>')}</p>`)
    .join('\n');
};

const renderSlide = (slide, index) => {
  const id = stableClassPart(slide.id, `slide-${index + 1}`);
  const role = stableClassPart(slide.role, 'content');
  const layout = stableClassPart(slide.layout_intent, 'default');

  return [
    `<section id="${escapeHtml(id)}" class="slide slide-${escapeHtml(role)} layout-${escapeHtml(layout)}">`,
    `  <h2>${escapeHtml(slide.headline)}</h2>`,
    renderBody(slide.body),
    '</section>'
  ].filter(Boolean).join('\n');
};

export function renderHtmlDeck(contract) {
  const title = contract?.title ?? 'Deck';
  const theme = stableClassPart(contract?.theme?.renderer_hint, 'default');
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, "Segoe UI", Arial, sans-serif; }
    body { margin: 0; background: #f7f6f2; color: #151923; }
    .deck { min-height: 100vh; }
    .slide { box-sizing: border-box; min-height: 100vh; padding: 72px 9vw; display: flex; flex-direction: column; justify-content: center; gap: 24px; border-bottom: 1px solid rgba(21, 25, 35, 0.12); }
    .slide h2 { max-width: 980px; margin: 0; font-size: clamp(2rem, 6vw, 5rem); line-height: 1.02; letter-spacing: 0; }
    .slide p { max-width: 820px; margin: 0; font-size: 1.15rem; line-height: 1.65; }
    .layout-hero-dark { background: #151923; color: #f7f6f2; }
    .theme-indigo-porcelain .slide:not(.layout-hero-dark) { background: #f7f6f2; color: #151923; }
    .theme-ink-classic .slide:not(.layout-hero-dark) { background: #fbfaf6; color: #161616; }
  </style>
</head>
<body>
<main class="deck theme-${escapeHtml(theme)}">
${slides.map(renderSlide).join('\n')}
</main>
</body>
</html>`;
}
