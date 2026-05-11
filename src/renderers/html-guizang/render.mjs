import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';

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
  #deck[data-renderer] .slide code { font-family: var(--mono); font-size: 0.92em; }
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
  #deck[data-renderer] .layout-text-split h2 { max-width: none; font-size: clamp(2rem, 4.2vw, 4rem); line-height: 1.08; }
  #deck[data-renderer] .layout-text-split .slide-body { max-width: none; padding-left: min(4vw, 48px); border-left: 1px solid rgba(var(--ink-rgb), 0.24); }
  @media (max-width: 720px) {
    #deck[data-renderer] .slide-copy { max-width: none; }
    #deck[data-renderer] .layout-text-split .slide-copy { grid-template-columns: minmax(0, 1fr); }
    #deck[data-renderer] .layout-text-split .slide-body { padding-left: 0; border-left: 0; }
  }
`;

const splitTableRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

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

const renderBody = (body) => {
  if (typeof body !== 'string' || body.length === 0) {
    return '';
  }

  const paragraphs = body
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
      if (isMarkdownTableBlock(lines)) {
        return renderMarkdownTable(lines);
      }

      return `<p>${renderInline(paragraph.trim()).replaceAll('\n', '<br>')}</p>`;
    })
    .join('\n');

  return `<div class="slide-body body-zh" data-anim>\n${paragraphs}\n</div>`;
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

const renderSlide = (slide, index, totalSlides, title) => {
  const id = stableClassPart(slide.id, `slide-${index + 1}`);
  const role = stableClassPart(slide.role, 'content');
  const layout = stableClassPart(slide.layout_intent, 'default');
  const surface = role === 'cover' || layout === 'hero-dark' || layout === 'quote'
    ? 'dark'
    : 'light';
  const label = String(index + 1).padStart(2, '0');
  const headingTag = role === 'cover' || layout === 'hero-dark' ? 'h1' : 'h2';
  const headingClass = headingTag === 'h1' ? 'h-hero' : 'h-xl';
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
    `    <${headingTag} class="${headingClass}" data-anim>${escapeHtml(slide.headline)}</${headingTag}>`,
    renderBody(slide.body),
    renderEvidenceRefs(slide.evidence_refs),
    '  </div>',
    '  <div class="foot">',
    `    <span class="title">${escapeHtml(title)}</span>`,
    `    <span>${escapeHtml(id)}</span>`,
    '  </div>',
    '</section>'
  ].filter(Boolean).join('\n');
};

export function renderHtmlDeck(contract) {
  const title = contract?.title ?? 'Deck';
  const theme = resolveTheme(contract?.theme?.renderer_hint);
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];
  const slideHtml = slides
    .map((slide, index) => renderSlide(slide, index, slides.length, title))
    .join('\n');

  return loadVendoredTemplate()
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(externalLucideScriptPattern, '\n')
    .replace('</style>', `${renderDeckgenOverrides(theme)}\n</style>`)
    .replace(
      '<div id="deck">',
      `<div id="deck" class="deck theme-${escapeHtml(theme.key)}" data-renderer="html-guizang" data-guizang-theme="${escapeHtml(theme.key)}">`
    )
    .replace(slidesPlaceholder, slideHtml);
}
