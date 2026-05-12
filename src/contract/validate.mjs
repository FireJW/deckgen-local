import {
  allowedOutputs,
  allowedProfiles,
  deckContractSchemaVersion,
  requiredContractKeys
} from './schema.mjs';
import { isAbsolute } from 'node:path';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const fail = (error) => ({ ok: false, error });
const allowedContractKeys = new Set(requiredContractKeys);
const allowedSourceRefKeys = new Set(['type', 'path', 'role', 'id']);
const allowedEvidenceRefKeys = new Set(['id', 'source_ref', 'locator', 'quote']);
const allowedSlideKeys = new Set(['id', 'role', 'headline', 'body', 'items', 'evidence_refs', 'layout_intent']);
const allowedSlideItemKeys = new Set(['kind', 'text', 'src', 'alt', 'markdown', 'points', 'evidence_refs']);
const allowedSlideItemKinds = new Set(['paragraph', 'quote', 'image', 'table', 'bullets']);
const allowedThemeKeys = new Set(['renderer_hint', 'tone']);
const allowedSourceRefTypes = new Set(['local_file']);

export function validateDeckContract(contract) {
  try {
    return validateDeckContractInternal(contract);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown validation error';
    return fail(`invalid deck contract: ${message}`);
  }
}

function validateDeckContractInternal(contract) {
  if (!isObject(contract)) {
    return fail('contract must be an object');
  }

  for (const key of requiredContractKeys) {
    if (!Object.hasOwn(contract, key)) {
      return fail(`missing required key: ${key}`);
    }
  }

  for (const key of Object.keys(contract)) {
    if (!allowedContractKeys.has(key)) {
      return fail(`unexpected top-level key: ${key}`);
    }
  }

  for (const key of ['schema_version', 'title', 'audience', 'profile', 'language']) {
    if (!isNonEmptyString(contract[key])) {
      return fail(`${key} must be a non-empty string`);
    }
  }

  if (contract.schema_version !== deckContractSchemaVersion) {
    return fail('unsupported schema_version');
  }

  if (!allowedProfiles.includes(contract.profile)) {
    return fail('profile must be one of briefing, learning, article');
  }

  if (!isPositiveInteger(contract.duration_minutes)) {
    return fail('duration_minutes must be a positive integer');
  }

  if (!isPositiveInteger(contract.target_slide_count)) {
    return fail('target_slide_count must be a positive integer');
  }

  if (!Array.isArray(contract.source_refs)) {
    return fail('source_refs must be an array');
  }

  const sourceRefsValidation = validateSourceRefs(contract.source_refs);
  if (!sourceRefsValidation.ok) {
    return sourceRefsValidation;
  }
  const knownSourceRefKeys = collectSourceRefKeys(contract.source_refs);
  const knownSourceRefIds = collectSourceRefIds(contract.source_refs);

  if (!Array.isArray(contract.hard_constraints)) {
    return fail('hard_constraints must be an array');
  }

  for (const [index, hardConstraint] of contract.hard_constraints.entries()) {
    if (!isNonEmptyString(hardConstraint)) {
      return fail(`hard_constraints[${index}] must be a non-empty string`);
    }
  }

  if (!isObject(contract.theme)) {
    return fail('theme must be an object');
  }

  for (const key of Object.keys(contract.theme)) {
    if (!allowedThemeKeys.has(key)) {
      return fail(`theme has unexpected key: ${key}`);
    }
  }

  if (!isNonEmptyString(contract.theme.renderer_hint)) {
    return fail('theme.renderer_hint must be a non-empty string');
  }

  if (Object.hasOwn(contract.theme, 'tone') && typeof contract.theme.tone !== 'string') {
    return fail('theme.tone must be a string when present');
  }

  if (
    !Array.isArray(contract.outputs) ||
    contract.outputs.length === 0
  ) {
    return fail('outputs must be a non-empty array');
  }

  if (new Set(contract.outputs).size !== contract.outputs.length) {
    return fail('outputs must be unique');
  }

  if (contract.outputs.some((output) => !allowedOutputs.includes(output))) {
    return fail('outputs must contain only html and pptx');
  }

  if (!Array.isArray(contract.slides) || contract.slides.length === 0) {
    return fail('slides must be a non-empty array');
  }

  if (contract.target_slide_count !== contract.slides.length) {
    return fail('target_slide_count must equal slides.length');
  }

  const seenSlideIds = new Set();

  for (const [index, slide] of contract.slides.entries()) {
    const prefix = `slides[${index}]`;

    if (!isObject(slide)) {
      return fail(`${prefix} must be an object`);
    }

    for (const key of Object.keys(slide)) {
      if (!allowedSlideKeys.has(key)) {
        return fail(`${prefix} has unexpected key: ${key}`);
      }
    }

    for (const key of ['id', 'role', 'headline', 'layout_intent']) {
      if (!isNonEmptyString(slide[key])) {
        return fail(`${prefix}.${key} must be a non-empty string`);
      }
    }

    const slideId = slide.id.trim();
    if (seenSlideIds.has(slideId)) {
      return fail(`${prefix}.id must be unique`);
    }
    seenSlideIds.add(slideId);

    if (Object.hasOwn(slide, 'body') && typeof slide.body !== 'string') {
      return fail(`${prefix}.body must be a string when present`);
    }

    if (Object.hasOwn(slide, 'items')) {
      if (!Array.isArray(slide.items) || slide.items.length === 0) {
        return fail(`${prefix}.items must be a non-empty array when present`);
      }

      const slideItemsValidation = validateSlideItems({
        items: slide.items,
        prefix: `${prefix}.items`,
        knownSourceRefKeys,
        knownSourceRefIds
      });
      if (!slideItemsValidation.ok) {
        return slideItemsValidation;
      }
    }

    if (!Array.isArray(slide.evidence_refs)) {
      return fail(`${prefix}.evidence_refs must be an array`);
    }

    const evidenceRefsValidation = validateEvidenceRefs({
      evidenceRefs: slide.evidence_refs,
      prefix: `${prefix}.evidence_refs`,
      knownSourceRefKeys,
      knownSourceRefIds
    });
    if (!evidenceRefsValidation.ok) {
      return evidenceRefsValidation;
    }
  }

  return { ok: true };
}

function validateSourceRefs(sourceRefs) {
  const seenLegacyKeys = new Map();

  for (const [index, sourceRef] of sourceRefs.entries()) {
    const prefix = `source_refs[${index}]`;

    if (!isObject(sourceRef)) {
      return fail(`${prefix} must be an object`);
    }

    for (const key of Object.keys(sourceRef)) {
      if (!allowedSourceRefKeys.has(key)) {
        return fail(`${prefix} has unexpected key: ${key}`);
      }
    }

    for (const key of ['type', 'path', 'role']) {
      if (!isNonEmptyString(sourceRef[key])) {
        return fail(`${prefix}.${key} must be a non-empty string`);
      }
    }

    if (!allowedSourceRefTypes.has(sourceRef.type.trim())) {
      return fail(`${prefix}.type must be local_file`);
    }

    const path = sourceRef.path.trim();
    if (!isAbsolute(path)) {
      return fail(`${prefix}.path must be an absolute path`);
    }

    const pathValidation = registerLegacyKey({
      seenLegacyKeys,
      index,
      prefix,
      field: 'path',
      value: path
    });
    if (pathValidation) {
      return pathValidation;
    }

    if (Object.hasOwn(sourceRef, 'id') && !isNonEmptyString(sourceRef.id)) {
      return fail(`${prefix}.id must be a non-empty string when present`);
    }

    if (Object.hasOwn(sourceRef, 'id')) {
      const idValidation = registerLegacyKey({
        seenLegacyKeys,
        index,
        prefix,
        field: 'id',
        value: sourceRef.id.trim()
      });
      if (idValidation) {
        return idValidation;
      }
    }

    const roleValidation = registerLegacyKey({
      seenLegacyKeys,
      index,
      prefix,
      field: 'role',
      value: sourceRef.role.trim()
    });
    if (roleValidation) {
      return roleValidation;
    }
  }

  return { ok: true };
}

function validateSlideItems({ items, prefix, knownSourceRefKeys, knownSourceRefIds }) {
  for (const [index, item] of items.entries()) {
    const itemPrefix = `${prefix}[${index}]`;

    if (!isObject(item)) {
      return fail(`${itemPrefix} must be an object`);
    }

    for (const key of Object.keys(item)) {
      if (!allowedSlideItemKeys.has(key)) {
        return fail(`${itemPrefix} has unexpected key: ${key}`);
      }
    }

    if (!isNonEmptyString(item.kind)) {
      return fail(`${itemPrefix}.kind must be a non-empty string`);
    }

    const kind = item.kind.trim();
    if (!allowedSlideItemKinds.has(kind)) {
      return fail(`${itemPrefix}.kind must be one of paragraph, quote, image, table, bullets`);
    }

    if (kind === 'paragraph' || kind === 'quote') {
      if (!isNonEmptyString(item.text)) {
        return fail(`${itemPrefix}.text must be a non-empty string`);
      }
    }

    if (kind === 'bullets') {
      if (!Array.isArray(item.points) || item.points.length === 0) {
        return fail(`${itemPrefix}.points must be a non-empty array`);
      }

      for (const [pointIndex, point] of item.points.entries()) {
        if (!isNonEmptyString(point)) {
          return fail(`${itemPrefix}.points[${pointIndex}] must be a non-empty string`);
        }
      }
    }

    if (kind === 'image') {
      if (!isNonEmptyString(item.src)) {
        return fail(`${itemPrefix}.src must be a non-empty string`);
      }
      if (Object.hasOwn(item, 'alt') && typeof item.alt !== 'string') {
        return fail(`${itemPrefix}.alt must be a string when present`);
      }
    }

    if (kind === 'table') {
      if (!isNonEmptyString(item.markdown)) {
        return fail(`${itemPrefix}.markdown must be a non-empty string`);
      }
    }

    if (Object.hasOwn(item, 'evidence_refs')) {
      if (!Array.isArray(item.evidence_refs)) {
        return fail(`${itemPrefix}.evidence_refs must be an array when present`);
      }

      const evidenceRefsValidation = validateEvidenceRefs({
        evidenceRefs: item.evidence_refs,
        prefix: `${itemPrefix}.evidence_refs`,
        knownSourceRefKeys,
        knownSourceRefIds
      });
      if (!evidenceRefsValidation.ok) {
        return evidenceRefsValidation;
      }
    }
  }

  return { ok: true };
}

function registerLegacyKey({ seenLegacyKeys, index, prefix, field, value }) {
  const existing = seenLegacyKeys.get(value);
  if (existing && existing.index !== index) {
    return fail(`${prefix}.${field} must be unique across source_refs; collides with ${existing.prefix}.${existing.field}`);
  }

  if (!existing) {
    seenLegacyKeys.set(value, { index, prefix, field });
  }

  return undefined;
}

function collectSourceRefKeys(sourceRefs) {
  const keys = new Set();

  for (const sourceRef of sourceRefs) {
    for (const key of ['id', 'role', 'path']) {
      if (isNonEmptyString(sourceRef[key])) {
        keys.add(sourceRef[key].trim());
      }
    }
  }

  return keys;
}

function collectSourceRefIds(sourceRefs) {
  const ids = new Set();

  for (const sourceRef of sourceRefs) {
    if (isNonEmptyString(sourceRef.id)) {
      ids.add(sourceRef.id.trim());
    }
  }

  return ids;
}

function validateEvidenceRefs({ evidenceRefs, prefix, knownSourceRefKeys, knownSourceRefIds }) {
  const seenObjectIds = new Set();

  for (const [index, evidenceRef] of evidenceRefs.entries()) {
    const itemPrefix = `${prefix}[${index}]`;

    if (typeof evidenceRef === 'string') {
      if (!isNonEmptyString(evidenceRef)) {
        return fail(`${itemPrefix} must be a non-empty string`);
      }
      if (!knownSourceRefKeys.has(evidenceRef.trim())) {
        return fail(`${itemPrefix} must match a source_refs id, role, or path`);
      }
      continue;
    }

    if (!isObject(evidenceRef)) {
      return fail(`${itemPrefix} must be a non-empty string or object`);
    }

    for (const key of Object.keys(evidenceRef)) {
      if (!allowedEvidenceRefKeys.has(key)) {
        return fail(`${itemPrefix} has unexpected key: ${key}`);
      }
    }

    if (!isNonEmptyString(evidenceRef.id)) {
      return fail(`${itemPrefix}.id must be a non-empty string`);
    }

    const id = evidenceRef.id.trim();
    if (seenObjectIds.has(id)) {
      return fail(`${itemPrefix}.id must be unique within the slide`);
    }
    seenObjectIds.add(id);

    if (!['source_ref', 'locator', 'quote'].some((key) => Object.hasOwn(evidenceRef, key))) {
      return fail(`${itemPrefix} must include source_ref, locator, or quote`);
    }

    if (Object.hasOwn(evidenceRef, 'source_ref') && !isNonEmptyString(evidenceRef.source_ref)) {
      return fail(`${itemPrefix}.source_ref must be a non-empty string when present`);
    }

    for (const key of ['locator', 'quote']) {
      if (Object.hasOwn(evidenceRef, key) && !isNonEmptyString(evidenceRef[key])) {
        return fail(`${itemPrefix}.${key} must be a non-empty string when present`);
      }
    }

    if (Object.hasOwn(evidenceRef, 'source_ref')) {
      if (!isNonEmptyString(evidenceRef.source_ref)) {
        return fail(`${itemPrefix}.source_ref must be a non-empty string when present`);
      }
      if (!knownSourceRefIds.has(evidenceRef.source_ref.trim())) {
        return fail(`${itemPrefix}.source_ref must match a source_refs id`);
      }
    }
  }

  return { ok: true };
}
