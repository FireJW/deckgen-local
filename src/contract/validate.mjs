import {
  allowedOutputs,
  allowedProfiles,
  deckContractSchemaVersion,
  requiredContractKeys
} from './schema.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const fail = (error) => ({ ok: false, error });

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

  if (!Array.isArray(contract.hard_constraints)) {
    return fail('hard_constraints must be an array');
  }

  if (!isObject(contract.theme)) {
    return fail('theme must be an object');
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

  for (const [index, slide] of contract.slides.entries()) {
    const prefix = `slides[${index}]`;

    if (!isObject(slide)) {
      return fail(`${prefix} must be an object`);
    }

    for (const key of ['id', 'role', 'headline', 'layout_intent']) {
      if (!isNonEmptyString(slide[key])) {
        return fail(`${prefix}.${key} must be a non-empty string`);
      }
    }

    if (Object.hasOwn(slide, 'body') && typeof slide.body !== 'string') {
      return fail(`${prefix}.body must be a string when present`);
    }

    if (!Array.isArray(slide.evidence_refs)) {
      return fail(`${prefix}.evidence_refs must be an array`);
    }
  }

  return { ok: true };
}
