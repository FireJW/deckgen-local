import {
  allowedOutputs,
  deckContractSchemaVersion,
  requiredContractKeys
} from './schema.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateDeckContract(contract) {
  if (!isObject(contract)) {
    return { ok: false, error: 'contract must be an object' };
  }

  for (const key of requiredContractKeys) {
    if (!Object.hasOwn(contract, key)) {
      return { ok: false, error: `missing required key: ${key}` };
    }
  }

  if (contract.schema_version !== deckContractSchemaVersion) {
    return { ok: false, error: `unsupported schema_version: ${contract.schema_version}` };
  }

  if (
    !Array.isArray(contract.outputs) ||
    contract.outputs.length === 0 ||
    contract.outputs.some((output) => !allowedOutputs.includes(output))
  ) {
    return { ok: false, error: 'invalid outputs' };
  }

  if (!Array.isArray(contract.slides) || contract.slides.length === 0) {
    return { ok: false, error: 'slides must be a non-empty array' };
  }

  return { ok: true };
}
