const compact = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

export function formatEvidenceRef(evidenceRef) {
  if (typeof evidenceRef === 'string') {
    const ref = compact(evidenceRef);
    return ref ? `source: ${ref}` : '';
  }

  if (evidenceRef === null || typeof evidenceRef !== 'object' || Array.isArray(evidenceRef)) {
    return '';
  }

  const parts = [];
  const id = compact(evidenceRef.id);
  const sourceRef = compact(evidenceRef.source_ref);
  const locator = compact(evidenceRef.locator);
  const quote = compact(evidenceRef.quote);

  if (id) {
    parts.push(id);
  }
  if (sourceRef) {
    parts.push(`source: ${sourceRef}`);
  }
  if (locator) {
    parts.push(locator);
  }
  if (quote) {
    parts.push(quote);
  }

  return parts.join(' | ');
}

export function formatEvidenceRefs(evidenceRefs) {
  if (!Array.isArray(evidenceRefs)) {
    return [];
  }

  return evidenceRefs
    .map((evidenceRef) => formatEvidenceRef(evidenceRef))
    .filter(Boolean);
}
