const hasField = (contract, field) => {
  const parts = String(field).split('.');

  const walk = (value, index) => {
    if (index >= parts.length) {
      return value !== undefined;
    }

    const part = parts[index];
    if (part.endsWith('[]')) {
      const key = part.slice(0, -2);
      const next = value?.[key];
      if (!Array.isArray(next) || next.length === 0) {
        return false;
      }
      if (index === parts.length - 1) {
        return true;
      }
      return next.every((item) => walk(item, index + 1));
    }

    if (value == null || !Object.prototype.hasOwnProperty.call(value, part)) {
      return false;
    }

    return index === parts.length - 1 ? true : walk(value[part], index + 1);
  };

  return walk(contract, 0);
};

export function evaluateHtmlAnythingTemplate({ template, sourcePackage }) {
  const missingContractFields = template.contract_fields.filter((field) => !hasField(sourcePackage.contract, field));
  const supportsProfile = template.supported_profiles.includes(sourcePackage.profile);
  const status = !supportsProfile ? 'reject' : missingContractFields.length > 0 ? 'hold' : template.decision;
  const reason = !supportsProfile
    ? `profile ${sourcePackage.profile} is not in supported_profiles`
    : missingContractFields.length > 0
      ? `missing contract fields: ${missingContractFields.join(', ')}`
      : template.decision === 'promote'
        ? 'profile supported and all required contract fields are available'
        : template.decision === 'hold'
          ? 'template is a candidate, but it stays in the lab until a promotion review'
          : 'template is intentionally rejected for the first slice';
  const fallback = !supportsProfile
    ? `Use existing deckgen renderer; template does not support ${sourcePackage.profile}.`
    : missingContractFields.length > 0
      ? `Hold until source fixtures include: ${missingContractFields.join(', ')}.`
      : template.decision === 'promote'
        ? 'Use existing deckgen renderer if implementation scope grows.'
        : template.decision === 'hold'
          ? 'Keep existing deckgen renderer until a promotion review selects this template.'
          : 'Use existing deckgen renderer; template is not part of the first promotion slice.';

  return {
    id: template.id,
    destination: template.destination,
    status,
    reason,
    fallback,
    supportsProfile,
    missingContractFields
  };
}
