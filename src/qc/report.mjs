export function buildQcReport({ sourcePath, validation, htmlPath, pptxPaths = [], pptxQa = [] } = {}) {
  const validationStatus = validation?.ok ? 'PASS' : 'FAIL';
  const validationDetail = validation?.ok ? '' : ` ${validation?.error ?? 'unknown validation error'}`;
  const pptxQaLines = pptxQa.map((item) => {
    const status = item.actual_slide_count === item.expected_slide_count ? 'PASS' : 'FAIL';
    return `pptx_slide_count: ${status} ${item.actual_slide_count}/${item.expected_slide_count} ${item.path ?? ''}`;
  });

  return [
    `source: ${sourcePath ?? ''}`,
    `validation: ${validationStatus}${validationDetail}`,
    `html: ${htmlPath ?? ''}`,
    `pptx: ${pptxPaths.join(', ')}`,
    ...pptxQaLines
  ].join('\n');
}
