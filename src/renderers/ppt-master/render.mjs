import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { formatEvidenceRefs } from '../../contract/evidence.mjs';
import { inspectPptxFile } from '../../qc/pptx-structural-smoke.mjs';

const exporterRelativePath = path.join('skills', 'ppt-master', 'scripts', 'svg_to_pptx.py');

const requiredString = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required for PPTX output`);
  }

  return value.trim();
};

const escapeXml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const slugPart = (value, fallback) => {
  const slug = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || fallback;
};

const wrapText = (value, maxChars, maxLines) => {
  const words = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  return lines.length ? lines : [''];
};

const slideStem = (slide, index) => `${String(index + 1).padStart(2, '0')}_${slugPart(slide?.id, 'slide')}`;

const splitTableRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isTableSeparator = (line) => {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const parseMarkdownTable = (body) => {
  const paragraphs = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.split('\n').map((line) => line.trim()).filter(Boolean));

  const tableLines = paragraphs.find((lines) =>
    lines.length >= 2 &&
    lines[0].includes('|') &&
    lines[1].includes('|') &&
    isTableSeparator(lines[1])
  );

  if (!tableLines) {
    return null;
  }

  return {
    headers: splitTableRow(tableLines[0]),
    rows: tableLines.slice(2).map((line) => splitTableRow(line))
  };
};

const cleanCellText = (value) => String(value ?? '').replace(/`([^`]*)`/g, '$1');

const splitTextSplitBody = (body) => {
  const normalized = String(body ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) {
    return [paragraphs[0], paragraphs.slice(1).join(' ')];
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return [lines[0], lines.slice(1).join(' ')];
  }

  return [paragraphs[0] ?? lines[0] ?? '', ''];
};

const renderTextSplitSvg = ({ body, x, y, width, bodyColor, accent }) => {
  const [leftText, rightText] = splitTextSplitBody(body);
  const gap = 48;
  const columnWidth = (width - gap) / 2;
  const panelHeight = 420;
  const lineHeight = 36;
  const textY = y + 66;
  const renderColumnText = (value, columnX) => wrapText(value, 34, 8)
    .map((line, lineIndex) =>
      `<text x="${columnX + 34}" y="${textY + lineIndex * lineHeight}" font-family="Arial, sans-serif" font-size="27" fill="${bodyColor}">${escapeXml(line)}</text>`
    )
    .join('\n    ');

  return [
    '<g class="ppt-text-split">',
    `  <rect x="${x}" y="${y}" width="${columnWidth}" height="${panelHeight}" rx="22" fill="#eff6ff" stroke="#bfdbfe" stroke-width="2"/>`,
    `  <rect x="${x}" y="${y}" width="8" height="${panelHeight}" rx="4" fill="${accent}"/>`,
    `  <rect x="${x + columnWidth + gap}" y="${y}" width="${columnWidth}" height="${panelHeight}" rx="22" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>`,
    `  ${renderColumnText(leftText, x)}`,
    `  ${renderColumnText(rightText, x + columnWidth + gap)}`,
    '</g>'
  ].join('\n  ');
};

const renderTableSvg = ({ table, x, y, width, bodyColor, accent }) => {
  const columnCount = Math.max(1, table.headers.length);
  const rowCount = Math.min(5, table.rows.length);
  const columnWidth = width / columnCount;
  const rowHeight = 48;
  const headerHeight = 50;
  const height = headerHeight + rowCount * rowHeight;
  const cells = [];

  table.headers.forEach((header, index) => {
    cells.push(`<text x="${x + index * columnWidth + 18}" y="${y + 33}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${bodyColor}">${escapeXml(cleanCellText(header))}</text>`);
  });

  table.rows.slice(0, rowCount).forEach((row, rowIndex) => {
    const cellY = y + headerHeight + rowIndex * rowHeight + 32;
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      cells.push(`<text x="${x + columnIndex * columnWidth + 18}" y="${cellY}" font-family="Arial, sans-serif" font-size="24" fill="${bodyColor}">${escapeXml(cleanCellText(row[columnIndex] ?? ''))}</text>`);
    }
  });

  const horizontalLines = Array.from({ length: rowCount + 1 }, (_, index) =>
    `<line x1="${x}" y1="${y + headerHeight + index * rowHeight}" x2="${x + width}" y2="${y + headerHeight + index * rowHeight}" stroke="#cbd5e1" stroke-width="2"/>`
  );
  const verticalLines = Array.from({ length: columnCount + 1 }, (_, index) =>
    `<line x1="${x + index * columnWidth}" y1="${y}" x2="${x + index * columnWidth}" y2="${y + height}" stroke="#cbd5e1" stroke-width="2"/>`
  );

  return [
    '<g class="ppt-table">',
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${headerHeight}" fill="#e0f2fe"/>`,
    `<rect x="${x}" y="${y}" width="10" height="${height}" fill="${accent}"/>`,
    ...horizontalLines,
    ...verticalLines,
    ...cells,
    '</g>'
  ].join('\n  ');
};

const renderEvidenceSvg = ({ evidenceRefs, x, y, color }) => {
  const lines = formatEvidenceRefs(evidenceRefs)
    .slice(0, 3)
    .map((line) => wrapText(line, 92, 1)[0])
    .filter(Boolean);
  if (lines.length === 0) {
    return '';
  }

  return [
    '<g class="ppt-evidence-refs">',
    ...lines.map((line, index) =>
      `<text x="${x}" y="${y + index * 26}" font-family="Arial, sans-serif" font-size="18" fill="${color}">${escapeXml(line)}</text>`
    ),
    '</g>'
  ].join('\n  ');
};

const renderSlideNotes = (slide) => {
  const notes = [];
  const body = String(slide?.body ?? '').trimEnd();
  const evidenceRefs = formatEvidenceRefs(slide?.evidence_refs);

  if (body) {
    notes.push(body);
  }
  if (evidenceRefs.length > 0) {
    notes.push('## Evidence', ...evidenceRefs.map((ref) => `- ${ref}`));
  }

  return `${notes.join('\n')}\n`;
};

const renderSlideSvg = (slide, index) => {
  const isCover = index === 0 || slide?.role === 'cover';
  const background = isCover ? '#101820' : '#f8fafc';
  const headlineColor = isCover ? '#ffffff' : '#111827';
  const bodyColor = isCover ? '#dbeafe' : '#475569';
  const accent = isCover ? '#38bdf8' : '#2563eb';
  const headlineLines = wrapText(slide?.headline, isCover ? 24 : 34, isCover ? 3 : 2);
  const table = isCover ? null : parseMarkdownTable(slide?.body);
  const textSplit = !isCover && slide?.layout_intent === 'text_split' && !table;
  const bodyLines = table || textSplit ? [] : wrapText(slide?.body, 52, isCover ? 4 : 7);
  const headlineStartY = isCover ? 280 : 150;
  const bodyStartY = headlineStartY + (headlineLines.length * (isCover ? 76 : 58)) + 52;

  const headlineSvg = headlineLines.map((line, lineIndex) =>
    `<text x="120" y="${headlineStartY + lineIndex * (isCover ? 76 : 58)}" font-family="Arial, sans-serif" font-size="${isCover ? 64 : 48}" font-weight="700" fill="${headlineColor}">${escapeXml(line)}</text>`
  ).join('\n  ');
  let bodySvg;
  if (table) {
    bodySvg = renderTableSvg({ table, x: 120, y: bodyStartY, width: 1040, bodyColor, accent });
  } else if (textSplit) {
    bodySvg = renderTextSplitSvg({ body: slide?.body, x: 120, y: bodyStartY, width: 1040, bodyColor, accent });
  } else {
    bodySvg = bodyLines.map((line, lineIndex) =>
      `<text x="120" y="${bodyStartY + lineIndex * 38}" font-family="Arial, sans-serif" font-size="30" fill="${bodyColor}">${escapeXml(line)}</text>`
    ).join('\n  ');
  }
  const evidenceSvg = renderEvidenceSvg({
    evidenceRefs: slide?.evidence_refs,
    x: 120,
    y: 748,
    color: isCover ? '#94a3b8' : '#64748b'
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="${background}"/>
  <rect x="120" y="${isCover ? 210 : 96}" width="180" height="10" rx="5" fill="${accent}"/>
  ${headlineSvg}
  ${bodySvg}
  ${evidenceSvg}
  <text x="120" y="820" font-family="Arial, sans-serif" font-size="22" fill="${isCover ? '#94a3b8' : '#64748b'}">${escapeXml(slide?.role ?? 'slide')}</text>
</svg>
`;
};

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writePptMasterProject = ({ contract, content = '', projectDir }) => {
  const notesDir = path.join(projectDir, 'notes');
  const svgOutputDir = path.join(projectDir, 'svg_output');
  const svgFinalDir = path.join(projectDir, 'svg_final');
  const exportsDir = path.join(projectDir, 'exports');

  mkdirSync(notesDir, { recursive: true });
  mkdirSync(svgOutputDir, { recursive: true });
  mkdirSync(svgFinalDir, { recursive: true });
  mkdirSync(exportsDir, { recursive: true });

  writeJson(path.join(projectDir, 'deck_contract.json'), contract);
  writeFileSync(path.join(projectDir, 'content.md'), content, 'utf8');
  writeFileSync(path.join(projectDir, 'design_spec.md'), [
    `# ${contract.title}`,
    '',
    '- format: ppt169',
    `- audience: ${contract.audience ?? ''}`,
    `- profile: ${contract.profile ?? ''}`,
    `- theme: ${contract.theme?.renderer_hint ?? ''}`,
    ''
  ].join('\n'), 'utf8');

  contract.slides.forEach((slide, index) => {
    const stem = slideStem(slide, index);
    const svg = renderSlideSvg(slide, index);
    writeFileSync(path.join(svgOutputDir, `${stem}.svg`), svg, 'utf8');
    writeFileSync(path.join(svgFinalDir, `${stem}.svg`), svg, 'utf8');
    writeFileSync(path.join(notesDir, `${stem}.md`), renderSlideNotes(slide), 'utf8');
  });

  return { exportsDir };
};

const findPptxArtifacts = (exportsDir) => {
  if (!existsSync(exportsDir)) {
    return [];
  }

  return readdirSync(exportsDir)
    .filter((entry) => entry.toLowerCase().endsWith('.pptx'))
    .map((entry) => path.join(exportsDir, entry))
    .filter((entryPath) => statSync(entryPath).isFile())
    .map((entryPath) => ({ path: entryPath, inspection: inspectPptxFile(entryPath) }))
    .filter(({ inspection }) => inspection.ok);
};

const trimProcessOutput = (value) => String(value ?? '').trim().slice(0, 2000);

export const shouldUseShellForCommand = (commandPath) =>
  process.platform === 'win32' && /\.(cmd|bat)$/i.test(commandPath);

export const getPptMasterExporterPath = (pptMasterPath) =>
  path.join(pptMasterPath, exporterRelativePath);

export const resolvePptMasterPythonPath = ({ pptMasterPath, pythonPath, env = process.env }) => {
  if (pythonPath) {
    return pythonPath;
  }

  if (env.DECKGEN_PPT_MASTER_PYTHON) {
    return env.DECKGEN_PPT_MASTER_PYTHON;
  }

  const localVenvPython = process.platform === 'win32'
    ? path.join(pptMasterPath, '.venv', 'Scripts', 'python.exe')
    : path.join(pptMasterPath, '.venv', 'bin', 'python');
  if (existsSync(localVenvPython)) {
    return localVenvPython;
  }

  return process.platform === 'win32' ? 'py' : 'python3';
};

export const renderPptMasterDeck = ({ contract, content = '', config = {}, outputDir }) => {
  if (typeof config.pptMasterPath !== 'string' || config.pptMasterPath.trim() === '') {
    throw new Error('pptMasterPath is required for PPTX output');
  }

  const projectDir = requiredString(outputDir, 'outputDir');
  const pptMasterPath = path.resolve(config.pptMasterPath);
  const exporterPath = getPptMasterExporterPath(pptMasterPath);
  if (!existsSync(exporterPath)) {
    throw new Error(`ppt-master exporter not found: ${exporterPath}`);
  }

  mkdirSync(projectDir, { recursive: true });
  const { exportsDir } = writePptMasterProject({ contract, content, projectDir });
  const pythonPath = resolvePptMasterPythonPath({
    pptMasterPath,
    pythonPath: config.pythonPath
  });
  const run = spawnSync(pythonPath, [
    exporterPath,
    projectDir,
    '--only',
    'native',
    '--no-compat',
    '--quiet'
  ], {
    cwd: path.dirname(exporterPath),
    encoding: 'utf8',
    shell: shouldUseShellForCommand(pythonPath)
  });

  if (run.error) {
    throw new Error(`ppt-master export failed to start: ${run.error.message}`);
  }

  if (run.status !== 0) {
    const detail = trimProcessOutput(run.stderr || run.stdout);
    throw new Error(`ppt-master export failed with status ${run.status}${detail ? `: ${detail}` : ''}`);
  }

  const pptxArtifacts = findPptxArtifacts(exportsDir);
  if (pptxArtifacts.length === 0) {
    throw new Error(`ppt-master exporter did not create a valid PPTX artifact in ${exportsDir}`);
  }

  const expectedSlideCount = Array.isArray(contract.slides) ? contract.slides.length : 0;
  const pptxQa = pptxArtifacts.map(({ path: pptxPath, inspection }) => ({
    path: pptxPath,
    expected_slide_count: expectedSlideCount,
    actual_slide_count: inspection.slideCount
  }));
  const mismatched = pptxQa.find((item) => item.actual_slide_count !== item.expected_slide_count);
  if (mismatched) {
    throw new Error(`ppt-master exporter created PPTX with slide count ${mismatched.actual_slide_count}; expected ${mismatched.expected_slide_count}: ${mismatched.path}`);
  }

  return {
    projectDir,
    exportsDir,
    pptxPaths: pptxArtifacts.map((artifact) => artifact.path),
    pptxQa
  };
};
