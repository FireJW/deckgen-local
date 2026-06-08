import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';
import { splitMarkdownTableRow } from '../../contract/markdown-table.mjs';
import { collectSlideEvidenceRefs, slideMarkdownBody } from '../../contract/slide-content.mjs';
import { isSwissRendererHint } from '../guizang-swiss/theme.mjs';
import { renderThemeToneAttribute } from './attributes.mjs';
import { renderSwissHtmlDeck } from './swiss.mjs';

const rendererDir = path.dirname(fileURLToPath(import.meta.url));
const vendoredGuizangRoot = path.resolve(rendererDir, '..', '..', '..', 'third_party', 'guizang-ppt-skill');
const templatePath = path.join(vendoredGuizangRoot, 'assets', 'template.html');
const motionAssetPath = path.join(vendoredGuizangRoot, 'assets', 'motion.min.js');
const slidesPlaceholder = '<!-- SLIDES_HERE -->';
const externalLucideScriptPattern = /\n?<script src="https:\/\/unpkg\.com\/lucide@latest\/dist\/umd\/lucide\.min\.js"><\/script>\n?/;

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderInline = (value) =>
  String(value ?? '')
    .split(/(`[^`]*`)/g)
    .map((part) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }

      return escapeHtml(part);
    })
    .join('');

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

let cachedTemplate = '';

const loadVendoredTemplate = () => {
  if (!cachedTemplate) {
    cachedTemplate = readFileSync(templatePath, 'utf8');
  }
  return cachedTemplate;
};

export const getHtmlGuizangAssetFiles = () => [
  {
    sourcePath: motionAssetPath,
    relativePath: path.join('assets', 'motion.min.js')
  }
];

const renderDeckgenOverrides = (theme) => `
  /* ============ Deckgen contract bridge ============ */
  :root { ${renderThemeVars(theme.vars)} }
  #deck[data-renderer] * { letter-spacing: 0; overflow-wrap: anywhere; }
  #deck[data-renderer] .slide-kicker { display: inline-block; justify-self: start; }
  #deck[data-renderer] .slide-copy { max-width: 1060px; display: grid; gap: 28px; margin-top: auto; margin-bottom: auto; }
  #deck[data-renderer] .slide-body { display: grid; gap: 18px; max-width: 820px; }
  #deck[data-renderer] .slide p { margin: 0; font-size: 1.16rem; line-height: 1.72; }
  #deck[data-renderer] blockquote { margin: 0; padding: 24px 28px; border-left: 3px solid currentColor; font-family: var(--serif-zh); font-size: clamp(1.5rem, 3vw, 3rem); line-height: 1.26; background: rgba(var(--paper-rgb), 0.08); }
  #deck[data-renderer] .light blockquote { background: rgba(var(--ink-rgb), 0.05); }
  #deck[data-renderer] .deckgen-figure { margin: 0; display: grid; gap: 12px; max-width: min(100%, 960px); }
  #deck[data-renderer] .deckgen-figure img { display: block; width: 100%; max-height: min(52vh, 520px); object-fit: contain; background: rgba(var(--ink-rgb), 0.06); border: 1px solid rgba(var(--ink-rgb), 0.14); }
  #deck[data-renderer] .deckgen-figure figcaption { font-family: var(--mono); font-size: 0.78rem; line-height: 1.4; color: rgba(var(--ink-rgb), 0.64); }
  #deck[data-renderer] .deckgen-list { margin: 0; padding-left: 1.3rem; display: grid; gap: 10px; max-width: 820px; }
  #deck[data-renderer] .deckgen-list li { margin: 0; line-height: 1.55; }
  #deck[data-renderer] .slide code { font-family: var(--mono); font-size: 0.92em; }
  #deck[data-renderer] .deckgen-figure.image-landscape img{max-height:min(58vh,560px)}
  #deck[data-renderer] .deckgen-figure.image-fit-cover img{aspect-ratio:var(--image-aspect,16/9);object-fit:cover;max-height:min(58vh,560px)}
  #deck[data-renderer] .deckgen-figure.image-portrait{justify-items:center}
  #deck[data-renderer] .deckgen-figure.image-portrait img{width:auto;max-width:100%;max-height:min(60vh,600px)}
  #deck[data-renderer] .table-wrap { max-width: 100%; overflow-x: auto; border: 1px solid rgba(var(--ink-rgb), 0.18); }
  #deck[data-renderer] table { width: 100%; border-collapse: collapse; font-size: 0.98rem; line-height: 1.35; }
  #deck[data-renderer] th, #deck[data-renderer] td { padding: 10px 12px; border-bottom: 1px solid rgba(var(--ink-rgb), 0.14); text-align: left; vertical-align: top; }
  #deck[data-renderer] th { font-family: var(--mono); font-size: 0.76rem; text-transform: uppercase; color: rgba(var(--ink-rgb), 0.76); background: rgba(var(--ink-rgb), 0.06); }
  #deck[data-renderer] tr:last-child td { border-bottom: 0; }
  #deck[data-renderer] .slide-evidence-refs { display: grid; gap: 8px; margin-top: 20px; max-width: 820px; max-height: min(15vh, 132px); overflow: hidden; font-family: var(--mono); font-size: 0.78rem; line-height: 1.44; color: rgba(var(--ink-rgb), 0.64); }
  #deck[data-renderer] .dark .slide-evidence-refs { color: rgba(var(--paper-rgb), 0.68); }
  #deck[data-renderer] .slide-evidence-ref { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; overflow-wrap: anywhere; }
  #deck[data-renderer] .slide-evidence .slide-copy, #deck[data-renderer] .slide-content .slide-copy { grid-template-columns: minmax(0, 1fr); }
  #deck[data-renderer] .slide-content:not(.layout-text-split) .slide-copy, #deck[data-renderer] .slide-evidence .slide-copy { align-content: center; }
  #deck[data-renderer] .slide-content:not(.layout-text-split) h2, #deck[data-renderer] .slide-evidence h2 { font-size: clamp(2rem, 5vw, 4.6rem); line-height: 1.08; }
  #deck[data-renderer] .layout-text-split .slide-copy { max-width: 1180px; grid-template-columns: minmax(0, 0.78fr) minmax(0, 1fr); align-items: start; column-gap: min(6vw, 84px); }
  #deck[data-renderer] .layout-text-split .slide-kicker { grid-column: 1 / -1; }
  #deck[data-renderer] .layout-text-split .text-split-lead { grid-column: 1; display: grid; gap: 18px; align-self: start; }
  #deck[data-renderer] .layout-text-split .text-split-lead h2 { max-width: none; font-size: clamp(2rem, 4.2vw, 4rem); line-height: 1.08; }
  #deck[data-renderer] .layout-text-split .slide-body-left { max-width: none; }
  #deck[data-renderer] .layout-text-split .slide-body-right { max-width: none; padding-left: min(4vw, 48px); border-left: 1px solid rgba(var(--ink-rgb), 0.24); }
  #deck[data-renderer] .layout-text-split .slide-body-right { grid-column: 2; align-self: start; }
  #deck[data-renderer] .layout-text-split .slide-evidence-refs { grid-column: 2; align-self: start; }
  @media (max-width: 720px) {
    #deck[data-renderer] .slide-copy { max-width: none; }
    #deck[data-renderer] .layout-text-split .slide-copy { grid-template-columns: minmax(0, 1fr); }
    #deck[data-renderer] .layout-text-split .slide-kicker, #deck[data-renderer] .layout-text-split .text-split-lead, #deck[data-renderer] .layout-text-split .slide-body-right, #deck[data-renderer] .layout-text-split .slide-evidence-refs { grid-column: 1; }
    #deck[data-renderer] .layout-text-split .slide-body-right { padding-left: 0; border-left: 0; }
  }
`;

const splitTableRow = (line) =>
  splitMarkdownTableRow(line);

const isBulletLine = (line) => /^[-*+]\s+\S/.test(line) || /^\d+[.)]\s+\S/.test(line);

const isTableSeparator = (line) => {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const isMarkdownTableBlock = (lines) =>
  lines.length >= 2 &&
  lines[0].includes('|') &&
  lines[1].includes('|') &&
  isTableSeparator(lines[1]);

const renderTableCells = (tag, cells) =>
  cells.map((cell) => `<${tag}>${renderInline(cell)}</${tag}>`).join('');

const renderMarkdownTable = (lines) => {
  const headerCells = splitTableRow(lines[0]);
  const bodyRows = lines.slice(2).map((line) => splitTableRow(line));

  return [
    '<div class="table-wrap">',
    '<table>',
    `<thead><tr>${renderTableCells('th', headerCells)}</tr></thead>`,
    '<tbody>',
    ...bodyRows.map((cells) => `<tr>${renderTableCells('td', cells)}</tr>`),
    '</tbody>',
    '</table>',
    '</div>'
  ].join('\n');
};

const renderMarkdownList = (lines) => [
  '<ul class="deckgen-list">',
  ...lines.map((line) => `<li>${renderInline(line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())}</li>`),
  '</ul>'
].join('\n');

const isBlockquoteBlock = (lines) =>
  lines.length > 0 && lines.every((line) => line.startsWith('>'));

const parseMarkdownImageLine = (line) => {
  const match = String(line ?? '').trim().match(/^!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
  if (!match) {
    return null;
  }

  const alt = match[1].trim();
  const src = match[2].trim();
  if (!src) {
    return null;
  }

  return { alt, src };
};

const normalizeAssetKey = (value) =>
  String(value ?? '').replaceAll('\\', '/').replace(/^\.?\//, '');

const createImageAssetMap = (imageAssets) => {
  const map = new Map();
  for (const asset of Array.isArray(imageAssets) ? imageAssets : []) {
    const key = normalizeAssetKey(asset?.relativePath);
    if (key) {
      map.set(key, asset);
    }
  }
  return map;
};

const imageAssetForSrc = (src, imageAssetsByPath) =>
  imageAssetsByPath.get(normalizeAssetKey(src));

const formatNumber = (value) =>
  Number(Number(value).toFixed(4)).toString();

const imageFitHint = (visualHints) =>
  visualHints?.image_fit === 'cover' ? 'cover' : 'contain';

const htmlImageMetadata = (image, imageAssetsByPath, visualHints) => {
  const asset = imageAssetForSrc(image.src, imageAssetsByPath);
  const imageFit = imageFitHint(visualHints);
  if (!asset || !asset.width || !asset.height || !asset.aspectRatio) {
    return {
      figureClass: `deckgen-figure${imageFit === 'cover' ? ' image-fit-cover' : ''}`,
      figureAttrs: imageFit === 'cover' ? ' data-image-fit="cover"' : '',
      imageAttrs: ''
    };
  }

  const orientation = stableClassPart(asset.orientation, 'landscape');
  const fitClass = imageFit === 'cover' ? ' image-fit-cover' : '';
  const fitAttr = imageFit === 'cover' ? ' data-image-fit="cover"' : '';
  return {
    figureClass: `deckgen-figure image-${orientation}${fitClass}`,
    figureAttrs: ` data-image-orientation="${escapeHtml(orientation)}"${fitAttr} style="--image-aspect:${escapeHtml(formatNumber(asset.aspectRatio))}"`,
    imageAttrs: ` width="${escapeHtml(String(asset.width))}" height="${escapeHtml(String(asset.height))}"`
  };
};

const renderBlockquote = (lines) => {
  const quote = lines
    .map((line) => line.replace(/^>\s?/, '').trim())
    .filter(Boolean)
    .map(renderInline)
    .join('<br>');
  return `<blockquote>${quote}</blockquote>`;
};

const renderMarkdownImage = (image, imageAssetsByPath, visualHints) => {
  const caption = image.alt || image.src;
  const metadata = htmlImageMetadata(image, imageAssetsByPath, visualHints);
  return [
    `<figure class="${metadata.figureClass}"${metadata.figureAttrs}>`,
    `  <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy"${metadata.imageAttrs}>`,
    caption ? `  <figcaption>${escapeHtml(caption)}</figcaption>` : '',
    '</figure>'
  ].filter(Boolean).join('\n');
};

const splitTextSplitParagraphs = (body) => {
  const normalized = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) {
    let bestSplitIndex = 1;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (let index = 1; index < paragraphs.length; index += 1) {
      const left = paragraphs.slice(0, index).join(' ');
      const right = paragraphs.slice(index).join(' ');
      const delta = Math.abs(left.length - right.length);

      if (delta < bestDelta || (delta === bestDelta && index > bestSplitIndex)) {
        bestSplitIndex = index;
        bestDelta = delta;
      }
    }

    return [
      paragraphs.slice(0, bestSplitIndex),
      paragraphs.slice(bestSplitIndex)
    ];
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return [[lines[0]], [lines.slice(1).join(' ')]];
  }

  return [[paragraphs[0] ?? lines[0] ?? ''].filter(Boolean), []];
};

const renderBodyBlock = (paragraph, imageAssetsByPath, visualHints) => {
  const lines = String(paragraph ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const image = lines.length === 1 ? parseMarkdownImageLine(lines[0]) : null;
  if (image) {
    return renderMarkdownImage(image, imageAssetsByPath, visualHints);
  }
  if (isMarkdownTableBlock(lines)) {
    return renderMarkdownTable(lines);
  }
  if (lines.length > 0 && lines.every(isBulletLine)) {
    return renderMarkdownList(lines);
  }
  if (isBlockquoteBlock(lines)) {
    return renderBlockquote(lines);
  }

  return `<p>${renderInline(String(paragraph ?? '').trim()).replaceAll('\n', '<br>')}</p>`;
};

const renderBodyContainer = (paragraphs, className = 'slide-body body-zh', imageAssetsByPath = new Map(), visualHints = undefined) => {
  const blocks = paragraphs
    .map((paragraph) => renderBodyBlock(paragraph, imageAssetsByPath, visualHints))
    .filter(Boolean)
    .join('\n');

  if (!blocks) {
    return '';
  }

  return `<div class="${className}" data-anim>\n${blocks}\n</div>`;
};

const renderBody = (slide, imageAssetsByPath) => {
  const body = slideMarkdownBody(slide);
  if (typeof body !== 'string' || body.length === 0) {
    return '';
  }

  return renderBodyContainer(
    body
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    'slide-body body-zh',
    imageAssetsByPath,
    slide?.visual_hints
  );
};

const renderEvidenceRefs = (evidenceRefs) => {
  const refs = formatEvidenceRefs(evidenceRefs);
  if (refs.length === 0) {
    return '';
  }

  return [
    '<div class="slide-evidence-refs" data-anim>',
    ...refs.map((ref) => `      <div class="slide-evidence-ref">${escapeHtml(ref)}</div>`),
    '    </div>'
  ].join('\n');
};

const slideAnimation = (role, layout) => {
  if (role === 'cover' || layout === 'hero-dark') return 'hero';
  if (layout === 'quote') return 'quote';
  if (layout === 'text-split') return 'directional';
  if (layout === 'pipeline') return 'pipeline';
  return 'cascade';
};

const renderSlide = (slide, index, totalSlides, title, imageAssetsByPath) => {
  const id = stableClassPart(slide.id, `slide-${index + 1}`);
  const role = stableClassPart(slide.role, 'content');
  const layout = stableClassPart(slide.layout_intent, 'default');
  const surface = role === 'cover' || layout === 'hero-dark' || layout === 'quote'
    ? 'dark'
    : 'light';
  const label = String(index + 1).padStart(2, '0');
  const headingTag = role === 'cover' || layout === 'hero-dark' ? 'h1' : 'h2';
  const headingClass = headingTag === 'h1' ? 'h-hero' : 'h-xl';
  const body = slideMarkdownBody(slide);
  const textSplitBodies = layout === 'text-split'
    ? splitTextSplitParagraphs(body)
    : null;
  const slideClasses = [
    'slide',
    role === 'cover' || layout === 'hero-dark' ? 'hero' : '',
    surface,
    `slide-${role}`,
    `layout-${layout}`
  ].filter(Boolean).join(' ');

  return [
    `<section id="${escapeHtml(id)}" class="${escapeHtml(slideClasses)}" data-slide-index="${index}" data-theme="${escapeHtml(surface)}" data-role="${escapeHtml(role)}" data-layout="${escapeHtml(layout)}" data-animate="${escapeHtml(slideAnimation(role, layout))}">`,
    '  <div class="chrome">',
    `    <div class="left"><span>${escapeHtml(role)}</span><span class="sep"></span><span>${escapeHtml(title)}</span></div>`,
    `    <div class="right"><span>${escapeHtml(label)} / ${escapeHtml(String(totalSlides).padStart(2, '0'))}</span></div>`,
    '  </div>',
    '  <div class="slide-copy">',
    `    <div class="kicker slide-kicker" data-anim>${escapeHtml(label)} / ${escapeHtml(role)}</div>`,
    layout === 'text-split'
      ? [
        '    <div class="text-split-lead">',
        `      <${headingTag} class="${headingClass}" data-anim>${escapeHtml(slide.headline)}</${headingTag}>`,
        renderBodyContainer(textSplitBodies?.[0] ?? [], 'slide-body body-zh slide-body-left', imageAssetsByPath, slide?.visual_hints),
        '    </div>',
        renderBodyContainer(textSplitBodies?.[1] ?? [], 'slide-body body-zh slide-body-right', imageAssetsByPath, slide?.visual_hints)
      ].filter(Boolean).join('\n')
      : `    <${headingTag} class="${headingClass}" data-anim>${escapeHtml(slide.headline)}</${headingTag}>`,
    layout === 'text-split' ? '' : renderBody(slide, imageAssetsByPath),
    renderEvidenceRefs(collectSlideEvidenceRefs(slide)),
    '  </div>',
    '  <div class="foot">',
    `    <span class="title">${escapeHtml(title)}</span>`,
    `    <span>${escapeHtml(id)}</span>`,
    '  </div>',
    '</section>'
  ].filter(Boolean).join('\n');
};

export function renderHtmlDeck(contract, options = {}) {
  if (isSwissRendererHint(contract?.theme?.renderer_hint)) {
    return renderSwissHtmlDeck(contract, options);
  }

  const title = contract?.title ?? 'Deck';
  const theme = resolveTheme(contract?.theme?.renderer_hint);
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];
  const imageAssetsByPath = createImageAssetMap(options.imageAssets);
  const slideHtml = slides
    .map((slide, index) => renderSlide(slide, index, slides.length, title, imageAssetsByPath))
    .join('\n');

  return loadVendoredTemplate()
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(externalLucideScriptPattern, '\n')
    .replace('</style>', `${renderDeckgenOverrides(theme)}\n</style>`)
    .replace(
      '<div id="deck">',
      `<div id="deck" class="deck theme-${escapeHtml(theme.key)}" data-renderer="html-guizang" data-guizang-theme="${escapeHtml(theme.key)}"${renderThemeToneAttribute(contract?.theme?.tone)}>`
    )
    .replace(slidesPlaceholder, slideHtml);
}
