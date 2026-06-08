import { readFileSync } from 'node:fs';

export class HtmlAnythingLabError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HtmlAnythingLabError';
  }
}

const SELECTED_TEMPLATE_IDS = new Set([
  'deck-swiss-international',
  'deck-guizang-editorial',
  'article-magazine',
  'card-xiaohongshu',
  'social-carousel',
  'data-report',
  'video-hyperframes'
]);
const SHA1_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';
const isNonEmptyStringArray = (value) => Array.isArray(value)
  && value.length > 0
  && value.every(isNonEmptyString);

export function loadHtmlAnythingTemplateIndex(filePath) {
  let raw = '';
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new HtmlAnythingLabError(`Could not read template index: ${error.message}`);
  }

  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new HtmlAnythingLabError(`Invalid JSON in template index: ${filePath}`);
  }

  return value;
}

export function validateHtmlAnythingTemplateIndex(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index) || index.schema !== 'html_anything_template_index/v1') {
    return { ok: false, error: 'template index schema must be html_anything_template_index/v1' };
  }

  if (
    !index.source
    || typeof index.source !== 'object'
    || Array.isArray(index.source)
    || !isNonEmptyString(index.source.repo)
    || !SHA1_PATTERN.test(index.source.commit)
  ) {
    return { ok: false, error: 'template index source metadata is required' };
  }

  if (!Array.isArray(index.templates) || index.templates.length === 0) {
    return { ok: false, error: 'template index must include templates[]' };
  }

  const seenIds = new Set();
  for (const template of index.templates) {
    if (!template || typeof template !== 'object' || Array.isArray(template)) {
      return { ok: false, error: 'template entry must be an object' };
    }
    if (typeof template.id !== 'string' || !template.id) {
      return { ok: false, error: 'template id is required' };
    }
    if (!SELECTED_TEMPLATE_IDS.has(template.id)) {
      return { ok: false, error: `unknown template id: ${template.id}` };
    }
    if (seenIds.has(template.id)) {
      return { ok: false, error: `duplicate template id: ${template.id}` };
    }
    seenIds.add(template.id);
    if (!isNonEmptyString(template.example_url) || !SHA256_PATTERN.test(template.example_sha256)) {
      return { ok: false, error: `template ${template.id} requires example_url and example_sha256` };
    }
    if (!isNonEmptyString(template.license_note)) {
      return { ok: false, error: `template ${template.id} requires a license_note` };
    }
    if (!isNonEmptyString(template.destination)) {
      return { ok: false, error: `template ${template.id} requires destination` };
    }
    if (!isNonEmptyStringArray(template.supported_profiles)) {
      return { ok: false, error: `template ${template.id} requires supported_profiles[]` };
    }
    if (!isNonEmptyStringArray(template.contract_fields)) {
      return { ok: false, error: `template ${template.id} requires contract_fields[]` };
    }
    if (!['promote', 'hold', 'reject'].includes(template.decision)) {
      return { ok: false, error: `template ${template.id} has invalid decision` };
    }
  }

  return { ok: true, templates: index.templates };
}
