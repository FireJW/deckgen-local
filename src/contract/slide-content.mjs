import { formatEvidenceRef } from './evidence.mjs';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeMarkdown = (value) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

const serializeParagraphItem = (item) => isNonEmptyString(item?.text) ? item.text.trim() : '';

const serializeQuoteItem = (item) => {
  const lines = normalizeMarkdown(item?.text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return '';
  }

  return lines.map((line) => `> ${line}`).join('\n');
};

const serializeImageItem = (item) => {
  const src = String(item?.src ?? '').trim();
  if (!src) {
    return '';
  }

  const alt = String(item?.alt ?? '').trim();
  return `![${alt}](${src})`;
};

const serializeMarkdownTableCell = (value) =>
  String(value ?? '')
    .replace(/\r\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replaceAll('|', '\\|');

const serializeStructuredTableItem = (item) => {
  if (!Array.isArray(item?.headers) || item.headers.length === 0 || !Array.isArray(item?.rows) || item.rows.length === 0) {
    return '';
  }

  const headers = item.headers.map(serializeMarkdownTableCell);
  const rows = item.rows
    .filter((row) => Array.isArray(row))
    .map((row) => row.map(serializeMarkdownTableCell));

  if (rows.length === 0) {
    return '';
  }

  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
};

const serializeTableItem = (item) =>
  isNonEmptyString(item?.markdown)
    ? item.markdown.trim()
    : serializeStructuredTableItem(item);

const serializeBulletsItem = (item) => {
  if (!Array.isArray(item?.points) || item.points.length === 0) {
    return '';
  }

  return item.points
    .map((point) => String(point ?? '').trim())
    .filter(Boolean)
    .map((point) => `- ${point}`)
    .join('\n');
};

const serializeItem = (item) => {
  const kind = String(item?.kind ?? '').trim();

  if (kind === 'paragraph') {
    return serializeParagraphItem(item);
  }

  if (kind === 'quote') {
    return serializeQuoteItem(item);
  }

  if (kind === 'image') {
    return serializeImageItem(item);
  }

  if (kind === 'table') {
    return serializeTableItem(item);
  }

  if (kind === 'bullets') {
    return serializeBulletsItem(item);
  }

  return '';
};

export const slideMarkdownBody = (slide) => {
  if (isNonEmptyString(slide?.body)) {
    return slide.body;
  }

  if (!Array.isArray(slide?.items) || slide.items.length === 0) {
    return '';
  }

  return slide.items
    .map((item) => serializeItem(item))
    .filter(Boolean)
    .join('\n\n');
};

export const collectSlideEvidenceRefs = (slide) => {
  const refs = [];
  const seen = new Set();
  const pushRef = (ref) => {
    const key = formatEvidenceRef(ref);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    refs.push(ref);
  };

  if (Array.isArray(slide?.evidence_refs)) {
    slide.evidence_refs.forEach(pushRef);
  }

  if (Array.isArray(slide?.items)) {
    for (const item of slide.items) {
      if (Array.isArray(item?.evidence_refs)) {
        item.evidence_refs.forEach(pushRef);
      }
    }
  }

  return refs;
};

export const rewriteSlideImageItems = ({ items, copyImage, shouldCopyImage = () => true }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { items, changed: false };
  }

  let changed = false;
  const rewritten = items.map((item) => {
    const kind = String(item?.kind ?? '').trim();
    if (kind !== 'image') {
      return item;
    }

    const src = String(item?.src ?? '').trim();
    if (!src || !shouldCopyImage(src)) {
      return item;
    }

    const copied = copyImage(src);
    if (!copied) {
      return item;
    }

    changed = true;
    return { ...item, src: copied.relativePath };
  });

  return {
    items: changed ? rewritten : items,
    changed
  };
};
