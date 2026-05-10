export function buildQcReport({ sourcePath, validation, htmlPath, pptxPaths = [] } = {}) {
  const validationStatus = validation?.ok ? 'PASS' : 'FAIL';
  const validationDetail = validation?.ok ? '' : ` ${validation?.error ?? 'unknown validation error'}`;

  return [
    `source: ${sourcePath ?? ''}`,
    `validation: ${validationStatus}${validationDetail}`,
    `html: ${htmlPath ?? ''}`,
    `pptx: ${pptxPaths.join(', ')}`
  ].join('\n');
}
