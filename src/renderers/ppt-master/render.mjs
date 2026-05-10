import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';

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

const renderSlideSvg = (slide, index) => {
  const isCover = index === 0 || slide?.role === 'cover';
  const background = isCover ? '#101820' : '#f8fafc';
  const headlineColor = isCover ? '#ffffff' : '#111827';
  const bodyColor = isCover ? '#dbeafe' : '#475569';
  const accent = isCover ? '#38bdf8' : '#2563eb';
  const headlineLines = wrapText(slide?.headline, isCover ? 24 : 34, isCover ? 3 : 2);
  const bodyLines = wrapText(slide?.body, 52, isCover ? 4 : 7);
  const headlineStartY = isCover ? 280 : 150;
  const bodyStartY = headlineStartY + (headlineLines.length * (isCover ? 76 : 58)) + 52;

  const headlineSvg = headlineLines.map((line, lineIndex) =>
    `<text x="120" y="${headlineStartY + lineIndex * (isCover ? 76 : 58)}" font-family="Arial, sans-serif" font-size="${isCover ? 64 : 48}" font-weight="700" fill="${headlineColor}">${escapeXml(line)}</text>`
  ).join('\n  ');
  const bodySvg = bodyLines.map((line, lineIndex) =>
    `<text x="120" y="${bodyStartY + lineIndex * 38}" font-family="Arial, sans-serif" font-size="30" fill="${bodyColor}">${escapeXml(line)}</text>`
  ).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="${background}"/>
  <rect x="120" y="${isCover ? 210 : 96}" width="180" height="10" rx="5" fill="${accent}"/>
  ${headlineSvg}
  ${bodySvg}
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
    writeFileSync(path.join(notesDir, `${stem}.md`), `${slide.body ?? ''}\n`, 'utf8');
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
    .filter((entryPath) => statSync(entryPath).isFile());
};

const trimProcessOutput = (value) => String(value ?? '').trim().slice(0, 2000);

export const getPptMasterExporterPath = (pptMasterPath) =>
  path.join(pptMasterPath, exporterRelativePath);

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
  const pythonPath = config.pythonPath || process.env.DECKGEN_PPT_MASTER_PYTHON || (process.platform === 'win32' ? 'py' : 'python3');
  const run = spawnSync(pythonPath, [
    exporterPath,
    projectDir,
    '--only',
    'native',
    '--no-compat',
    '--quiet'
  ], {
    cwd: path.dirname(exporterPath),
    encoding: 'utf8'
  });

  if (run.error) {
    throw new Error(`ppt-master export failed to start: ${run.error.message}`);
  }

  if (run.status !== 0) {
    const detail = trimProcessOutput(run.stderr || run.stdout);
    throw new Error(`ppt-master export failed with status ${run.status}${detail ? `: ${detail}` : ''}`);
  }

  const pptxPaths = findPptxArtifacts(exportsDir);
  if (pptxPaths.length === 0) {
    throw new Error(`ppt-master exporter did not create a PPTX artifact in ${exportsDir}`);
  }

  return {
    projectDir,
    exportsDir,
    pptxPaths
  };
};
