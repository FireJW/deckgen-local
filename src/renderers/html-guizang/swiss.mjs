import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';
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

const bodyContainsTable = (body) =>
  String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .some((paragraph) => isMarkdownTableBlock(paragraph.split('\n').map((line) => line.trim()).filter(Boolean)));

const renderBody = (body) => {
  if (typeof body !== 'string' || body.length === 0) {
    return '';
  }

  const blocks = body
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

  return `<div class="body deckgen-swiss-body" data-anim="body">\n${blocks}\n</div>`;
};

const swissLayoutForSlide = (slide) => {
  const role = stableClassPart(slide?.role, 'content');
  const layout = stableClassPart(slide?.layout_intent, 'default');
  if (role === 'cover' || layout === 'hero-dark') return 'SWISS-COVER-ASCII';
  if (bodyContainsTable(slide?.body)) return 'S20';
  if (layout === 'text-split') return 'S03';
  return 'S19';
};

const renderEvidence = (slide) => {
  const refs = formatEvidenceRefs(slide?.evidence_refs);
  if (refs.length === 0) {
    return '';
  }

  return [
    '<div class="deckgen-swiss-footnote" data-anim="foot">',
    ...refs.map((ref) => `  <div>${escapeHtml(ref)}</div>`),
    '</div>'
  ].join('\n');
};

const renderSlide = (slide, index, total, title) => {
  const layout = swissLayoutForSlide(slide);
  const role = stableClassPart(slide?.role, 'content');
  const label = String(index + 1).padStart(2, '0');
  const totalLabel = String(total).padStart(2, '0');
  const surface = layout === 'SWISS-COVER-ASCII' ? 'accent' : 'light';
  const headingClass = layout === 'SWISS-COVER-ASCII' ? 'h-xl' : 'h-md';

  return [
    `<section class="slide ${surface}" data-layout="${layout}" data-animate="cascade" data-slide-index="${index}">`,
    '  <div class="canvas-card">',
    '    <div class="chrome-min tight">',
    `      <div class="l">${escapeHtml(title)}</div>`,
    `      <div class="r">${label} / ${totalLabel}</div>`,
    '    </div>',
    '    <div class="deckgen-swiss-copy" data-anim="body">',
    `      <div class="t-meta">${escapeHtml(role)}</div>`,
    `      <h2 class="${headingClass}">${escapeHtml(slide?.headline ?? '')}</h2>`,
    renderBody(slide?.body),
    renderEvidence(slide),
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
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-body{display:grid;gap:14px;max-width:74ch}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-body p{margin:0;line-height:1.5}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-footnote{margin-top:auto;font-family:var(--mono);font-size:12px;line-height:1.45;color:var(--grey-3);display:grid;gap:4px}
  #deck[data-renderer="html-guizang-swiss"] .deckgen-swiss-table-wrap{max-width:100%;overflow:hidden;border:1px solid var(--grey-2)}
  #deck[data-renderer="html-guizang-swiss"] table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:13px;line-height:1.35}
  #deck[data-renderer="html-guizang-swiss"] th,#deck[data-renderer="html-guizang-swiss"] td{padding:10px 12px;border-bottom:1px solid var(--grey-2);text-align:left;vertical-align:top}
  #deck[data-renderer="html-guizang-swiss"] th{background:var(--grey-1);font-weight:600}
`;

export function renderSwissHtmlDeck(contract) {
  const title = contract?.title ?? 'Deck';
  const theme = resolveSwissTheme(contract?.theme?.renderer_hint);
  const slides = Array.isArray(contract?.slides) ? contract.slides : [];
  const slideHtml = slides.map((slide, index) => renderSlide(slide, index, slides.length, title)).join('\n');
  const deckHtml = `<div id="deck" data-renderer="html-guizang-swiss" data-swiss-theme="${escapeHtml(theme.key)}">\n${slideHtml}\n</div>\n\n<div id="nav"></div>`;

  return readFileSync(templatePath, 'utf8')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(externalLucideScriptPattern, '\n')
    .replace(lucideCreateIconsPattern, '\n')
    .replace('</style>', `${renderDeckgenSwissOverrides(theme)}\n</style>`)
    .replace(deckBlockPattern, deckHtml);
}
