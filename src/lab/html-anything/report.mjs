const renderList = (items = []) => items.length === 0
  ? 'none'
  : items.join(', ');

export function buildHtmlAnythingLabReport({ runId, index, results }) {
  const lines = [];
  lines.push('# HTML Anything Local Template Lab');
  lines.push('');
  lines.push(`Run id: ${runId}`);
  lines.push(`Upstream repo: ${index.source.repo}`);
  lines.push(`Upstream commit: ${index.source.commit}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Source | Profile | Template | Status | Reason | Fallback |');
  lines.push('| --- | --- | --- | --- | --- | --- |');

  for (const sourceResult of results) {
    for (const templateResult of sourceResult.templateResults) {
      lines.push(`| ${sourceResult.sourceType} | ${sourceResult.profile} | ${templateResult.id} | ${templateResult.status} | ${templateResult.reason} | ${templateResult.fallback ?? 'none'} |`);
    }
  }

  lines.push('');
  lines.push('## Sources');
  lines.push('');

  for (const sourceResult of results) {
    lines.push(`### ${sourceResult.sourceType}`);
    lines.push('');
    lines.push(`Source path: ${sourceResult.sourcePath}`);
    lines.push(`Profile: ${sourceResult.profile}`);
    lines.push('');
    lines.push('### Template outcomes');
    lines.push('');
    for (const templateResult of sourceResult.templateResults) {
      lines.push(`- ${templateResult.id}: ${templateResult.status}`);
      lines.push(`  - Reason: ${templateResult.reason}`);
      lines.push(`  - Fallback: ${templateResult.fallback ?? 'none'}`);
      lines.push(`  - Destination: ${templateResult.destination}`);
      lines.push(`  - Missing fields: ${renderList(templateResult.missingContractFields)}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
