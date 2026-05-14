import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';
import { splitMarkdownTableRow } from '../../contract/markdown-table.mjs';
import { collectSlideEvidenceRefs, slideMarkdownBody } from '../../contract/slide-content.mjs';
import { resolveSwissTheme } from '../guizang-swiss/theme.mjs';

const rendererDir = path.dirname(fileURLToPath(import.meta.url));
const vendoredGuizangRoot = path.resolve(rendererDir, '..', '..', '..', 'third_party', 'guizang-ppt-skill');
const templatePath = path.join(vendoredGuizangRoot, 'assets', 'template-swiss.html');
const deckBlockPattern = /<div id="deck">[\s\S]*?\n<\/div>\s*\n\s*<div id="nav"><\/div>/;
const externalLucideScriptPattern = /\n?<script src="https:\/\/unpkg\.com\/lucide@latest\/dist\/umd\/lucide\.min\.js"><\/script>\n?/;
const lucideCreateIconsPattern = /\n?<script>lucide\.createIcons\(\);<\/script>\n?/;

const escapeHtml = (value) => String(value ?? '')
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

const stableClassPart = (value, fallback) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || fallback;

const renderThemeVars = (theme) => [
  `--paper:${theme.paper};`,
  `--paper-rgb:${theme.paperRgb};`,
  `--ink:${theme.ink};`,
  `--ink-rgb:${theme.inkRgb};`,
  `--grey-1:${theme.grey1};`,
  `--grey-2:${theme.grey2};`,
  `--grey-3:${theme.grey3};`,
  `--accent:${theme.accent};`,
  `--accent-rgb:${theme.accentRgb};`,
  `--accent-on:${theme.accentOn};`
].join('');

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
    '<div class="deckgen-swiss-table-wrap">',
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
  '<ul class="deckgen-swiss-list">',
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
      figureClass: `deckgen-swiss-figure${imageFit === 'cover' ? ' image-fit-cover' : ''}`,
      figureAttrs: imageFit === 'cover' ? ' data-image-fit="cover"' : '',
      imageAttrs: ''
    };
  }

  const orientation = stableClassPart(asset.orientation, 'landscape');
  const fitClass = imageFit === 'cover' ? ' image-fit-cover' : '';
  const fitAttr = imageFit === 'cover' ? ' data-image-fit="cover"' : '';
  return {
    figureClass: `deckgen-swiss-figure image-${orientation}${fitClass}`,
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

const bodyContainsTable = (slide) =>
  slideMarkdownBody(slide)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .some((paragraph) => isMarkdownTableBlock(paragraph.split('\n').map((line) => line.trim()).filter(Boolean)));

const renderBody = (slide, imageAssetsByPath) => {
  const body = slideMarkdownBody(slide);
  if (typeof body !== 'string' || body.length === 0) {
    return '';
  }

  const blocks = body
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
      const image = lines.length === 1 ? parseMarkdownImageLine(lines[0]) : null;
      if (image) {
        return renderMarkdownImage(image, imageAssetsByPath, slide?.visual_hints);
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

      return `<p>${renderInline(paragraph.trim()).replaceAll('\n', '<br>')}</p>`;
    })
    .join('\n');

  return `<div class="body deckgen-swiss-body" data-anim="body">\n${blocks}\n</div>`;
};

const swissLayoutForSlide = (slide) => {
  const role = stableClassPart(slide?.role, 'content');
  const layout = stableClassPart(slide?.layout_intent, 'default');
  if (role === 'cover' || layout === 'hero-dark') return 'SWISS-COVER-ASCII';
  if (layout === 'quote') return 'S09';
  if (layout === 'image') return 'S13';
  if (bodyContainsTable(slide)) return 'S20';
  if (layout === 'text-split') return 'S03';
  return 'S19';
};

const renderEvidence = (evidenceRefs) => {
  const refs = formatEvidenceRefs(evidenceRefs);
  if (refs.length === 0) {
    return '';
  }

  return [
    '<div class="deckgen-swiss-footnote" data-anim="foot">',
    ...refs.map((ref) => `  <div>${escapeHtml(ref)}</div>`),
    '</div>'
  ].join('\n');
};

const renderSlide = (slide, index, total, title, imageAssetsByPath) => {
  const layout = swissLayoutForSlide(slide);
  const role = stableClassPart(slide?.role, 'content');
  const label = String(index + 1).padStart(2, '0');
  const totalLabel = String(total).padStart(2, '0');
  const surface = layout === 'SWISS-COVER-ASCII' ? 'accent' : 'light';
  const headingClass = layout === 'SWISS-COVER-ASCII' ? 'h-xl' : 'h-md';
  const copyClass = [
    'deckgen-swiss-copy',
    layout === 'S03' ? 'deckgen-swiss-split' : '',
    layout === 'S09' ? 'deckgen-swiss-quote' : '',
    layout === 'S13' ? 'deckgen-swiss-image' : ''
  ].filter(Boolean).join(' ');

  return [
    `<section class="slide ${surface}" data-layout="${layout}" data-animate="cascade" data-slide-index="${index}">`,
    '  <div class="canvas-card">',
    '    <div class="chrome-min tight">',
    `      <div class="l">${escapeHtml(title)}</div>`,
    `      <div class="r">${label} / ${totalLabel}</div>`,
    '    </div>',
    `    <div class="${copyClass}" data-anim="body">`,
    `      <div class="t-meta">${escapeHtml(role)}</div>`,
    `      <h2 class="${headingClass}">${escapeHtml(slide?.headline ?? '')}</h2>`,
    renderBody(slide, imageAssetsByPath),
    renderEvidence(collectSlideEvidenceRefs(slide)),
    '    </div>',
    '  </div>',
    '</section>'
  ].filter(Boolean).join('\n');
};

const renderDeckgenSwissOverrides = (theme) => `
  :root{${renderThemeVars(theme)}}
  #deck[data-renderer="html-guizang-swiss"] *{letter-spacing:0;overflow-wrap:anywhere}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy{display:grid;gap:24px;max-width:72ch;align-content:start}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy h2{font-weight:300;line-height:1}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-split{max-width:100%;grid-template-columns:minmax(0,0.82fr) minmax(0,1fr);column-gap:56px;align-items:start}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-split .t-meta{grid-column:1 / -1}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-split h2{grid-column:1}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-split .deckgen-swiss-body{grid-column:2}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-split .deckgen-swiss-footnote{grid-column:2}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-quote{max-width:92ch}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-quote h2{font-size:clamp(2rem,4.4vw,5rem)}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-image{max-width:100%;grid-template-columns:minmax(0,0.7fr) minmax(0,1fr);column-gap:48px;align-items:start}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-image .t-meta{grid-column:1 / -1}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-copy.deckgen-swiss-image .deckgen-swiss-body{grid-column:2}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-body{display:grid;gap:14px;max-width:74ch}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-body p{margin:0;line-height:1.5}
  #deck[data-renderer="html-guizang-swiss"] blockquote{margin:0;padding:0 0 0 24px;border-left:4px solid var(--accent);font-size:clamp(1.7rem,3.8vw,4.8rem);font-weight:300;line-height:1.12;color:var(--ink)}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure{margin:0;display:grid;gap:10px;max-width:100%}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure img{display:block;width:100%;max-height:58vh;object-fit:contain;border:1px solid var(--grey-2);background:var(--grey-1)}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure.image-landscape img{max-height:62vh}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure.image-fit-cover img{aspect-ratio:var(--image-aspect,16/9);object-fit:cover;max-height:62vh}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure.image-portrait{justify-items:center}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure.image-portrait img{width:auto;max-width:100%;max-height:64vh}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-figure figcaption{font-family:var(--mono);font-size:12px;line-height:1.4;color:var(--grey-3)}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-list{margin:0;padding-left:1.2rem;display:grid;gap:10px;max-width:74ch}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-list li{margin:0;line-height:1.5}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-footnote{margin-top:auto;font-family:var(--mono);font-size:12px;line-height:1.45;color:var(--grey-3);display:grid;gap:4px}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-table-wrap{max-width:100%;overflow:hidden;border:1px solid var(--grey-2)}
  #deck[data-renderer="html-guizang-swiss"] table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:13px;line-height:1.35}
  #deck[data-renderer="html-guizang-swiss"] th,#deck[data-renderer="html-guizang-swiss"] td{padding:10px 12px;border-bottom:1px solid var(--grey-2);text-align:left;vertical-align:top}
  #deck[data-renderer="html-guizang-swiss"] th{background:var(--grey-1);font-weight:600}
`;

export function renderSwissHtmlDeck(contract, options = {}) {
  const title = contract?.title ?? 'Deck';
  const theme = resolveSwissTheme(contract?.theme?.renderer_hint);
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];
  const imageAssetsByPath = createImageAssetMap(options.imageAssets);
  const slideHtml = slides.map((slide, index) => renderSlide(slide, index, slides.length, title, imageAssetsByPath)).join('\n');
  const deckHtml = `<div id="deck" data-renderer="html-guizang-swiss" data-swiss-theme="${escapeHtml(theme.key)}">\n${slideHtml}\n</div>\n\n<div id="nav"></div>`;

  return readFileSync(templatePath, 'utf8')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(externalLucideScriptPattern, '\n')
    .replace(lucideCreateIconsPattern, '\n')
    .replace('</style>', `${renderDeckgenSwissOverrides(theme)}\n</style>`)
    .replace(deckBlockPattern, deckHtml);
}
