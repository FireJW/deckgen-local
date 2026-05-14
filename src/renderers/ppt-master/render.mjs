import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { materializeLocalImageAssets } from '../../assets/images.mjs';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';
import { splitMarkdownTableRow } from '../../contract/markdown-table.mjs';
import { collectSlideEvidenceRefs, slideMarkdownBody } from '../../contract/slide-content.mjs';
import { inspectPptxFile } from '../../qc/pptx-structural-smoke.mjs';
import { isSwissRendererHint, resolveSwissTheme } from '../guizang-swiss/theme.mjs';

const exporterRelativePath = path.join('skills', 'ppt-master', 'scripts', 'svg_to_pptx.py');
const defaultPptVisualTheme = {
  renderer: 'ppt-master',
  background: '#f8fafc',
  coverBackground: '#101820',
  headlineColor: '#111827',
  coverHeadlineColor: '#ffffff',
  bodyColor: '#475569',
  coverBodyColor: '#dbeafe',
  accent: '#2563eb',
  coverAccent: '#38bdf8',
  muted: '#64748b',
  coverMuted: '#94a3b8',
  line: '#cbd5e1',
  tableFill: '#ffffff',
  tableHeaderFill: '#e0f2fe',
  textSplitPrimaryFill: '#eff6ff',
  textSplitSecondaryFill: '#ffffff',
  textSplitPrimaryStroke: '#bfdbfe',
  textSplitSecondaryStroke: '#e2e8f0',
  panelRadius: 22,
  swiss: null
};

const resolvePptVisualTheme = (contract) => {
  if (!isSwissRendererHint(contract?.theme?.renderer_hint)) {
    return defaultPptVisualTheme;
  }

  const swiss = resolveSwissTheme(contract.theme.renderer_hint);
  return {
    renderer: 'ppt-master-swiss',
    background: swiss.paper,
    coverBackground: swiss.accent,
    headlineColor: swiss.ink,
    coverHeadlineColor: swiss.accentOn,
    bodyColor: swiss.ink,
    coverBodyColor: swiss.accentOn,
    accent: swiss.accent,
    coverAccent: swiss.accentOn,
    muted: swiss.grey3,
    coverMuted: swiss.accentOn,
    line: swiss.grey2,
    tableFill: swiss.paper,
    tableHeaderFill: swiss.grey1,
    textSplitPrimaryFill: swiss.paper,
    textSplitSecondaryFill: swiss.grey1,
    textSplitPrimaryStroke: swiss.grey2,
    textSplitSecondaryStroke: swiss.grey2,
    panelRadius: 0,
    swiss
  };
};

const requiredString = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required for PPTX output`);
  }

  return value.trim();
};

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const slugPart = (value, fallback) => {
  const slug = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || fallback;
};

const wrapText = (value, maxChars, maxLines) => {
  const words = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  return lines.length ? lines : [''];
};

const wrapTextWithOverflow = (value, maxChars, maxLines) => {
  const words = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines = [];
  let current = '';
  let truncated = false;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) {
        truncated = true;
        current = '';
        break;
      }
    } else {
      current = next;
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      truncated = true;
    }
  }

  return {
    lines: lines.length ? lines : [''],
    truncated
  };
};

const appendEllipsis = (line, maxChars) => {
  const text = String(line ?? '').trim();
  if (!text) {
    return '...';
  }

  if (text.length < maxChars) {
    return `${text}...`;
  }

  return `${text.slice(0, Math.max(1, maxChars - 3)).trimEnd()}...`;
};

const slideStem = (slide, index) => `${String(index + 1).padStart(2, '0')}_${slugPart(slide?.id, 'slide')}`;

const splitTableRow = (line) =>
  splitMarkdownTableRow(line);

const isBulletLine = (line) => /^[-*+]\s+\S/.test(line) || /^\d+[.)]\s+\S/.test(line);

const isTableSeparator = (line) => {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const parseMarkdownTable = (body) => {
  const paragraphs = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean));

  const tableLines = paragraphs.find((lines) =>
    lines.length >= 2 &&
    lines[0].includes('|') &&
    lines[1].includes('|') &&
    isTableSeparator(lines[1])
  );

  if (!tableLines) {
    return null;
  }

  return {
    headers: splitTableRow(tableLines[0]),
    rows: tableLines.slice(2).map((line) => splitTableRow(line))
  };
};

const parseMarkdownBulletList = (body) => {
  const lines = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean));

  const bulletLines = lines.find((items) => items.length > 0 && items.every(isBulletLine));
  if (!bulletLines) {
    return null;
  }

  return bulletLines.map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, '').trim()).filter(Boolean);
};

const cleanCellText = (value) => String(value ?? '')
  .replace(/`([^`]*)`/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const fitTableCellText = (value, columnWidth) => {
  const text = cleanCellText(value);
  const maxChars = Math.max(12, Math.floor((columnWidth - 28) / 9.5));
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars).trimEnd()}...`;
};

const splitTextSplitBody = (body) => {
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
      paragraphs.slice(0, bestSplitIndex).join(' '),
      paragraphs.slice(bestSplitIndex).join(' ')
    ];
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }

  return [paragraphs[0] ?? lines[0] ?? '', ''];
};

const parseBlockquoteBody = (body) => {
  const lines = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0 || !lines.every((line) => line.startsWith('>'))) {
    return null;
  }

  return lines
    .map((line) => line.replace(/^>\s?/, '').trim())
    .filter(Boolean);
};

const parseMarkdownImageBody = (body) => {
  const lines = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length !== 1) {
    return null;
  }

  const match = lines[0].match(/^!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
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

const roundedAttrs = (radius) => radius > 0 ? ` rx="${radius}"` : '';

const renderQuoteSvg = ({
  quoteLines,
  x,
  y,
  width,
  bodyColor,
  accent,
  line = defaultPptVisualTheme.line
}) => {
  const wrappedQuoteLines = quoteLines
    .flatMap((quoteLine) => wrapText(quoteLine, 42, 2))
    .slice(0, 5);
  const lineHeight = 54;
  return [
    '<g class="ppt-quote">',
    `  <line x1="${x}" y1="${y - 20}" x2="${x}" y2="${y + wrappedQuoteLines.length * lineHeight + 20}" stroke="${accent}" stroke-width="8"/>`,
    `  <line x1="${x + 34}" y1="${y - 20}" x2="${x + width}" y2="${y - 20}" stroke="${line}" stroke-width="2"/>`,
    ...wrappedQuoteLines.map((lineText, index) =>
      `<text x="${x + 34}" y="${y + index * lineHeight}" font-family="Arial, sans-serif" font-size="42" font-weight="400" fill="${bodyColor}">${escapeXml(lineText)}</text>`
    ),
    '</g>'
  ].join('\n  ');
};

const renderTextSplitSvg = ({
  body,
  x,
  y,
  width,
  bodyColor,
  accent,
  primaryFill = defaultPptVisualTheme.textSplitPrimaryFill,
  secondaryFill = defaultPptVisualTheme.textSplitSecondaryFill,
  primaryStroke = defaultPptVisualTheme.textSplitPrimaryStroke,
  secondaryStroke = defaultPptVisualTheme.textSplitSecondaryStroke,
  panelRadius = defaultPptVisualTheme.panelRadius
}) => {
  const [leftText, rightText] = splitTextSplitBody(body);
  const gap = 48;
  const columnWidth = (width - gap) / 2;
  const panelHeight = 420;
  const lineHeight = 36;
  const textY = y + 66;
  const renderColumnText = (value, columnX) => {
    const wrapped = wrapTextWithOverflow(value, 34, 8);
    const lines = wrapped.truncated
      ? [...wrapped.lines.slice(0, -1), appendEllipsis(wrapped.lines.at(-1), 34)]
      : wrapped.lines;
    return lines.map((line, lineIndex) =>
      `<text x="${columnX + 34}" y="${textY + lineIndex * lineHeight}" font-family="Arial, sans-serif" font-size="27" fill="${bodyColor}">${escapeXml(line)}</text>`
    )
      .join('\n    ');
  };

  return [
    '<g class="ppt-text-split">',
    `  <rect x="${x}" y="${y}" width="${columnWidth}" height="${panelHeight}"${roundedAttrs(panelRadius)} fill="${primaryFill}" stroke="${primaryStroke}" stroke-width="2"/>`,
    `  <rect x="${x}" y="${y}" width="8" height="${panelHeight}"${roundedAttrs(Math.min(4, panelRadius))} fill="${accent}"/>`,
    `  <rect x="${x + columnWidth + gap}" y="${y}" width="${columnWidth}" height="${panelHeight}"${roundedAttrs(panelRadius)} fill="${secondaryFill}" stroke="${secondaryStroke}" stroke-width="2"/>`,
    `  ${renderColumnText(leftText, x)}`,
    `  ${renderColumnText(rightText, x + columnWidth + gap)}`,
    '</g>'
  ].join('\n  ');
};

const renderImagePlaceholderSvg = ({
  x,
  y,
  width,
  height,
  bodyColor,
  line
}) => {
  const frameX = x + 42;
  const frameY = y + 112;
  const frameWidth = width - 84;
  const frameHeight = height - 182;
  const centerX = frameX + frameWidth / 2;
  const centerY = frameY + frameHeight / 2;

  return [
    '<g class="ppt-image-placeholder">',
    `  <rect x="${frameX}" y="${frameY}" width="${frameWidth}" height="${frameHeight}" rx="18" fill="none" stroke="${line}" stroke-width="2" stroke-dasharray="10 10"/>`,
    `  <text x="${centerX}" y="${centerY - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${bodyColor}">Preview unavailable in export</text>`,
    `  <text x="${centerX}" y="${centerY + 28}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${bodyColor}">Keep the source label for manual replacement.</text>`,
    '</g>'
  ].join('\n  ');
};

const formatImageSourceLabel = (src, isMaterializedAsset) => {
  const normalizedSrc = String(src ?? '').replaceAll('\\', '/').trim();
  if (!normalizedSrc) {
    return 'Source: image path unavailable';
  }

  if (isMaterializedAsset) {
    return 'Source: local asset copy';
  }

  if (normalizedSrc.startsWith('data:')) {
    return 'Source: embedded image data';
  }

  let label = normalizedSrc;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalizedSrc)) {
    try {
      const parsed = new URL(normalizedSrc);
      label = `${parsed.host}${parsed.pathname}`;
    } catch {
      label = normalizedSrc;
    }
  }

  const prefixed = `Source: ${label}`;
  if (prefixed.length <= 64) {
    return prefixed;
  }

  return `${prefixed.slice(0, 61).trimEnd()}...`;
};

const renderImageSvg = ({
  image,
  x,
  y,
  width,
  bodyColor,
  accent,
  line = defaultPptVisualTheme.line,
  fill = defaultPptVisualTheme.tableFill,
  panelRadius = defaultPptVisualTheme.panelRadius
}) => {
  const height = 390;
  const caption = image.alt || image.src;
  const isMaterializedAsset = String(image.src ?? '').replaceAll('\\', '/').startsWith('assets/images/');
  const sourceLabel = formatImageSourceLabel(image.src, isMaterializedAsset);
  const imageElement = isMaterializedAsset
    ? `  <image href="${escapeXml(image.src)}" x="${x + 42}" y="${y + 112}" width="${width - 84}" height="${height - 166}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  const placeholderSvg = isMaterializedAsset
    ? ''
    : renderImagePlaceholderSvg({
      x,
      y,
      width,
      height,
      bodyColor,
      line
    });
  return [
    '<g class="ppt-image">',
    `  <rect x="${x}" y="${y}" width="${width}" height="${height}"${roundedAttrs(panelRadius)} fill="${fill}" stroke="${line}" stroke-width="2"/>`,
    `  <rect x="${x}" y="${y}" width="10" height="${height}"${roundedAttrs(Math.min(4, panelRadius))} fill="${accent}"/>`,
    `  <text x="${x + 42}" y="${y + 68}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${bodyColor}">${escapeXml(caption)}</text>`,
    imageElement,
    placeholderSvg,
    `  <text x="${x + 42}" y="${y + height - 24}" font-family="Arial, sans-serif" font-size="18" fill="${bodyColor}">${escapeXml(sourceLabel)}</text>`,
    '</g>'
  ].join('\n  ');
};

const renderTableSvg = ({
  table,
  x,
  y,
  width,
  bodyColor,
  accent,
  line = defaultPptVisualTheme.line,
  fill = defaultPptVisualTheme.tableFill,
  headerFill = defaultPptVisualTheme.tableHeaderFill
}) => {
  const columnCount = Math.max(1, table.headers.length);
  const rowCount = Math.min(5, table.rows.length);
  const columnWidth = width / columnCount;
  const rowHeight = 48;
  const headerHeight = 50;
  const height = headerHeight + rowCount * rowHeight;
  const cells = [];

  table.headers.forEach((header, index) => {
    cells.push(`<text x="${x + index * columnWidth + 18}" y="${y + 33}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${bodyColor}">${escapeXml(fitTableCellText(header, columnWidth))}</text>`);
  });

  table.rows.slice(0, rowCount).forEach((row, rowIndex) => {
    const cellY = y + headerHeight + rowIndex * rowHeight + 32;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      cells.push(`<text x="${x + columnIndex * columnWidth + 18}" y="${cellY}" font-family="Arial, sans-serif" font-size="24" fill="${bodyColor}">${escapeXml(fitTableCellText(row[columnIndex] ?? '', columnWidth))}</text>`);
    }
  });

  const horizontalLines = Array.from({ length: rowCount + 1 }, (_, index) =>
    `<line x1="${x}" y1="${y + headerHeight + index * rowHeight}" x2="${x + width}" y2="${y + headerHeight + index * rowHeight}" stroke="${line}" stroke-width="2"/>`
  );
  const verticalLines = Array.from({ length: columnCount + 1 }, (_, index) =>
    `<line x1="${x + index * columnWidth}" y1="${y}" x2="${x + index * columnWidth}" y2="${y + height}" stroke="${line}" stroke-width="2"/>`
  );

  return [
    '<g class="ppt-table">',
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${line}" stroke-width="2"/>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" fill="${headerFill}"/>`,
    `<rect x="${x}" y="${y}" width="10" height="${height}" fill="${accent}"/>`,
    ...horizontalLines,
    ...verticalLines,
    ...cells,
    '</g>'
  ].join('\n  ');
};

const renderBulletsSvg = ({
  bullets,
  x,
  y,
  width,
  bodyColor,
  accent,
  line = defaultPptVisualTheme.line,
  fill = defaultPptVisualTheme.tableFill,
  panelRadius = defaultPptVisualTheme.panelRadius
}) => {
  const lineHeight = 44;
  const bulletLines = bullets
    .slice(0, 8)
    .flatMap((bullet) => wrapText(bullet, 48, 2).map((line, index) => ({
      line,
      continuation: index > 0
    })));
  const height = Math.max(220, bulletLines.length * lineHeight + 64);
  return [
    '<g class="ppt-bullets">',
    `  <rect x="${x}" y="${y}" width="${width}" height="${height}"${roundedAttrs(panelRadius)} fill="${fill}" stroke="${line}" stroke-width="2"/>`,
    `  <rect x="${x}" y="${y}" width="10" height="${height}"${roundedAttrs(Math.min(4, panelRadius))} fill="${accent}"/>`,
    ...bulletLines.map(({ line: lineText, continuation }, index) =>
      `<text x="${x + (continuation ? 74 : 42)}" y="${y + 58 + index * lineHeight}" font-family="Arial, sans-serif" font-size="26" fill="${bodyColor}">${continuation ? '' : '&#8226; '}${escapeXml(lineText)}</text>`
    ),
    '</g>'
  ].join('\n  ');
};

const renderEvidenceSvg = ({ evidenceRefs, x, y, color }) => {
  const lines = formatEvidenceRefs(evidenceRefs)
    .slice(0, 3)
    .map((line) => wrapText(line, 92, 1)[0])
    .filter(Boolean);
  if (lines.length === 0) {
    return '';
  }

  return [
    '<g class="ppt-evidence-refs">',
    ...lines.map((line, index) =>
      `<text x="${x}" y="${y + index * 26}" font-family="Arial, sans-serif" font-size="18" fill="${color}">${escapeXml(line)}</text>`
    ),
    '</g>'
  ].join('\n  ');
};

const renderSlideNotes = (slide) => {
  const notes = [];
  const body = slideMarkdownBody(slide).trimEnd();
  const evidenceRefs = formatEvidenceRefs(collectSlideEvidenceRefs(slide));

  if (body) {
    notes.push(body);
  }
  if (evidenceRefs.length > 0) {
    notes.push('## Evidence', ...evidenceRefs.map((ref) => `- ${ref}`));
  }

  return `${notes.join('\n')}\n`;
};

const renderSlideSvg = (slide, index, visualTheme) => {
  const isCover = index === 0 || slide?.role === 'cover';
  const body = slideMarkdownBody(slide);
  const background = isCover ? visualTheme.coverBackground : visualTheme.background;
  const headlineColor = isCover ? visualTheme.coverHeadlineColor : visualTheme.headlineColor;
  const bodyColor = isCover ? visualTheme.coverBodyColor : visualTheme.bodyColor;
  const accent = isCover ? visualTheme.coverAccent : visualTheme.accent;
  const muted = isCover ? visualTheme.coverMuted : visualTheme.muted;
  const headlineLines = wrapText(slide?.headline, isCover ? 24 : 34, isCover ? 3 : 2);
  const table = isCover ? null : parseMarkdownTable(body);
  const bullets = !isCover && !table && slide?.layout_intent !== 'quote' && slide?.layout_intent !== 'image'
    ? parseMarkdownBulletList(body)
    : null;
  const quote = !isCover && slide?.layout_intent === 'quote' && !table
    ? parseBlockquoteBody(body)
    : null;
  const image = !isCover && slide?.layout_intent === 'image' && !table && !quote
    ? parseMarkdownImageBody(body)
    : null;
  const textSplit = !isCover && slide?.layout_intent === 'text_split' && !table && !quote && !image && !bullets;
  const bodyLines = table || textSplit || quote || image || bullets ? [] : wrapText(body, 52, isCover ? 4 : 7);
  const headlineStartY = isCover ? 280 : 150;
  const bodyStartY = headlineStartY + (headlineLines.length * (isCover ? 76 : 58)) + 52;

  const headlineSvg = headlineLines.map((line, lineIndex) =>
    `<text x="120" y="${headlineStartY + lineIndex * (isCover ? 76 : 58)}" font-family="Arial, sans-serif" font-size="${isCover ? 64 : 48}" font-weight="700" fill="${headlineColor}">${escapeXml(line)}</text>`
  ).join('\n  ');
  let bodySvg;
  if (table) {
    bodySvg = renderTableSvg({
      table,
      x: 120,
      y: bodyStartY,
      width: 1040,
      bodyColor,
      accent,
      line: visualTheme.line,
      fill: visualTheme.tableFill,
      headerFill: visualTheme.tableHeaderFill
    });
  } else if (quote) {
    bodySvg = renderQuoteSvg({
      quoteLines: quote,
      x: 120,
      y: bodyStartY + 10,
      width: 1040,
      bodyColor,
      accent,
      line: visualTheme.line
    });
  } else if (image) {
    bodySvg = renderImageSvg({
      image,
      x: 120,
      y: bodyStartY,
      width: 1040,
      bodyColor,
      accent,
      line: visualTheme.line,
      fill: visualTheme.tableFill,
      panelRadius: visualTheme.panelRadius
    });
  } else if (bullets) {
    bodySvg = renderBulletsSvg({
      bullets,
      x: 120,
      y: bodyStartY,
      width: 1040,
      bodyColor,
      accent,
      line: visualTheme.line,
      fill: visualTheme.tableFill,
      panelRadius: visualTheme.panelRadius
    });
  } else if (textSplit) {
    bodySvg = renderTextSplitSvg({
      body,
      x: 120,
      y: bodyStartY,
      width: 1040,
      bodyColor,
      accent,
      primaryFill: visualTheme.textSplitPrimaryFill,
      secondaryFill: visualTheme.textSplitSecondaryFill,
      primaryStroke: visualTheme.textSplitPrimaryStroke,
      secondaryStroke: visualTheme.textSplitSecondaryStroke,
      panelRadius: visualTheme.panelRadius
    });
  } else {
    bodySvg = bodyLines.map((line, lineIndex) =>
      `<text x="120" y="${bodyStartY + lineIndex * 38}" font-family="Arial, sans-serif" font-size="30" fill="${bodyColor}">${escapeXml(line)}</text>`
    ).join('\n  ');
  }
  const evidenceSvg = renderEvidenceSvg({
    evidenceRefs: collectSlideEvidenceRefs(slide),
    x: 120,
    y: 748,
    color: muted
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" data-renderer="${visualTheme.renderer}">
  <rect width="1600" height="900" fill="${background}"/>
  <rect x="120" y="${isCover ? 210 : 96}" width="180" height="10"${roundedAttrs(visualTheme.panelRadius ? 5 : 0)} fill="${accent}"/>
  ${headlineSvg}
  ${bodySvg}
  ${evidenceSvg}
  <text x="120" y="820" font-family="Arial, sans-serif" font-size="22" fill="${muted}">${escapeXml(slide?.role ?? 'slide')}</text>
</svg>
`;
};

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writePptMasterProject = ({ contract, content = '', projectDir }) => {
  const notesDir = path.join(projectDir, 'notes');
  const svgOutputDir = path.join(projectDir, 'svg_output');
  const svgFinalDir = path.join(projectDir, 'svg_final');
  const exportsDir = path.join(projectDir, 'exports');
  const visualTheme = resolvePptVisualTheme(contract);

  mkdirSync(notesDir, { recursive: true });
  mkdirSync(svgOutputDir, { recursive: true });
  mkdirSync(svgFinalDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });

  writeJson(path.join(projectDir, 'deck_contract.json'), contract);
  writeFileSync(path.join(projectDir, 'content.md'), content, 'utf8');
  writeFileSync(path.join(projectDir, 'design_spec.md'), [
    `# ${contract.title}`,
    '',
    '- format: ppt169',
    `- audience: ${contract.audience ?? ''}`,
    `- profile: ${contract.profile ?? ''}`,
    `- theme: ${contract.theme?.renderer_hint ?? ''}`,
    ''
  ].join('\n'), 'utf8');

  contract.slides.forEach((slide, index) => {
    const stem = slideStem(slide, index);
    const svg = renderSlideSvg(slide, index, visualTheme);
    writeFileSync(path.join(svgOutputDir, `${stem}.svg`), svg, 'utf8');
    writeFileSync(path.join(svgFinalDir, `${stem}.svg`), svg, 'utf8');
    writeFileSync(path.join(notesDir, `${stem}.md`), renderSlideNotes(slide), 'utf8');
  });

  return { exportsDir };
};

const findPptxArtifacts = (exportsDir) => {
  if (!existsSync(exportsDir)) {
    return [];
  }

  return readdirSync(exportsDir)
    .filter((entry) => entry.toLowerCase().endsWith('.pptx'))
    .map((entry) => path.join(exportsDir, entry))
    .filter((entryPath) => statSync(entryPath).isFile())
    .map((entryPath) => ({ path: entryPath, inspection: inspectPptxFile(entryPath) }))
    .filter(({ inspection }) => inspection.ok);
};

const trimProcessOutput = (value) => String(value ?? '').trim().slice(0, 2000);

export const shouldUseShellForCommand = (commandPath) =>
  process.platform === 'win32' && /\.(cmd|bat)$/i.test(commandPath);

export const getPptMasterExporterPath = (pptMasterPath) =>
  path.join(pptMasterPath, exporterRelativePath);

export const resolvePptMasterPythonPath = ({ pptMasterPath, pythonPath, env = process.env }) => {
  if (pythonPath) {
    return pythonPath;
  }

  if (env.DECKGEN_PPT_MASTER_PYTHON) {
    return env.DECKGEN_PPT_MASTER_PYTHON;
  }

  const localVenvPython = process.platform === 'win32'
    ? path.join(pptMasterPath, '.venv', 'Scripts', 'python.exe')
    : path.join(pptMasterPath, '.venv', 'bin', 'python');
  if (existsSync(localVenvPython)) {
    return localVenvPython;
  }

  return process.platform === 'win32' ? 'py' : 'python3';
};

export const renderPptMasterDeck = ({ contract, content = '', config = {}, outputDir }) => {
  if (typeof config.pptMasterPath !== 'string' || config.pptMasterPath.trim() === '') {
    throw new Error('pptMasterPath is required for PPTX output');
  }

  const projectDir = requiredString(outputDir, 'outputDir');
  const pptMasterPath = path.resolve(config.pptMasterPath);
  const exporterPath = getPptMasterExporterPath(pptMasterPath);
  if (!existsSync(exporterPath)) {
    throw new Error(`ppt-master exporter not found: ${exporterPath}`);
  }

  mkdirSync(projectDir, { recursive: true });
  const materialized = materializeLocalImageAssets({
    contract,
    sourcePath: config.sourcePath,
    outputDir: projectDir
  });
  const { exportsDir } = writePptMasterProject({ contract: materialized.contract, content, projectDir });
  const pythonPath = resolvePptMasterPythonPath({
    pptMasterPath,
    pythonPath: config.pythonPath
  });
  const run = spawnSync(pythonPath, [
    exporterPath,
    projectDir,
    '--only',
    'native',
    '--no-compat',
    '--quiet'
  ], {
    cwd: path.dirname(exporterPath),
    encoding: 'utf8',
    shell: shouldUseShellForCommand(pythonPath)
  });

  if (run.error) {
    throw new Error(`ppt-master export failed to start: ${run.error.message}`);
  }

  if (run.status !== 0) {
    const detail = trimProcessOutput(run.stderr || run.stdout);
    throw new Error(`ppt-master export failed with status ${run.status}${detail ? `: ${detail}` : ''}`);
  }

  const pptxArtifacts = findPptxArtifacts(exportsDir);
  if (pptxArtifacts.length === 0) {
    throw new Error(`ppt-master exporter did not create a valid PPTX artifact in ${exportsDir}`);
  }

  const expectedSlideCount = Array.isArray(contract.slides) ? contract.slides.length : 0;
  const pptxQa = pptxArtifacts.map(({ path: pptxPath, inspection }) => ({
    path: pptxPath,
    expected_slide_count: expectedSlideCount,
    actual_slide_count: inspection.slideCount
  }));
  const mismatched = pptxQa.find((item) => item.actual_slide_count !== item.expected_slide_count);
  if (mismatched) {
    throw new Error(`ppt-master exporter created PPTX with slide count ${mismatched.actual_slide_count}; expected ${mismatched.expected_slide_count}: ${mismatched.path}`);
  }

  return {
    projectDir,
    exportsDir,
    pptxPaths: pptxArtifacts.map((artifact) => artifact.path),
    pptxQa
  };
};
