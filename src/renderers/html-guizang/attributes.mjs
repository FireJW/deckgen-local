export const escapeHtmlAttribute = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const renderThemeToneAttribute = (tone) => {
  const normalized = String(tone ?? '').trim();
  return normalized ? ` data-theme-tone="${escapeHtmlAttribute(normalized)}"` : '';
};
