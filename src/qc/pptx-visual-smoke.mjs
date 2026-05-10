import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const defaultPowerPointPaths = [
  'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
  'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE'
];

const psQuote = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;

export function resolvePowerPointExecutable(options = {}) {
  const {
    executablePath,
    env = process.env,
    exists = existsSync
  } = options;
  const candidates = [
    executablePath,
    env.DECKGEN_POWERPOINT_PATH,
    ...defaultPowerPointPaths
  ].filter((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);

  return candidates.find((candidate) => exists(candidate)) ?? '';
}

export function buildPowerPointExportScript({ pptxPath, screenshotPath, width = 1600, height = 900 } = {}) {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$pptx = ${psQuote(pptxPath)}`,
    `$out = ${psQuote(screenshotPath)}`,
    '$app = $null',
    '$presentation = $null',
    'try {',
    '  $app = New-Object -ComObject PowerPoint.Application',
    '  $presentation = $app.Presentations.Open($pptx, -1, 0, 0)',
    `  $presentation.Slides.Item(1).Export($out, 'PNG', ${Number(width)}, ${Number(height)})`,
    '} finally {',
    '  if ($presentation -ne $null) {',
    '    try { $presentation.Close() } catch {}',
    '    try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) } catch {}',
    '  }',
    '  if ($app -ne $null) {',
    '    try { $app.Quit() } catch {}',
    '    try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app) } catch {}',
    '  }',
    '  [GC]::Collect()',
    '  [GC]::WaitForPendingFinalizers()',
    '}'
  ].join('\n');
}

export function defaultPptxScreenshotPath(pptxPath, cwd = process.cwd()) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const basename = path.basename(pptxPath ?? 'deck.pptx', path.extname(pptxPath ?? 'deck.pptx'));
  return path.resolve(cwd, '.tmp', 'deckgen-pptx-visual-smoke', `${basename}-${stamp}-slide1.png`);
}

export function inspectPngFile(filePath) {
  const resolvedPath = path.resolve(filePath ?? '');
  const buffer = readFileSync(resolvedPath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(`Screenshot is not a PNG file: ${resolvedPath}`);
  }

  const ihdrLength = buffer.readUInt32BE(8);
  const chunkType = buffer.toString('ascii', 12, 16);
  if (ihdrLength !== 13 || chunkType !== 'IHDR') {
    throw new Error(`Screenshot PNG is missing an IHDR header: ${resolvedPath}`);
  }

  const imageWidth = buffer.readUInt32BE(16);
  const imageHeight = buffer.readUInt32BE(20);
  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth < 1 || imageHeight < 1) {
    throw new Error(`Screenshot PNG has invalid dimensions: ${resolvedPath}`);
  }

  return {
    screenshotMime: 'image/png',
    imageWidth,
    imageHeight
  };
}

export function exportFirstSlideWithPowerPoint(options = {}) {
  const {
    pptxPath,
    screenshotPath,
    powerPointPath,
    width = 1600,
    height = 900,
    exists = existsSync,
    spawn = spawnSync
  } = options;
  const resolvedPptxPath = path.resolve(pptxPath ?? '');
  const resolvedScreenshotPath = path.resolve(screenshotPath ?? defaultPptxScreenshotPath(resolvedPptxPath));
  const resolvedPowerPointPath = resolvePowerPointExecutable({
    executablePath: powerPointPath,
    exists
  });

  if (!exists(resolvedPowerPointPath)) {
    throw new Error('PowerPoint executable not found. Install Microsoft PowerPoint or pass --powerpoint-executable / set DECKGEN_POWERPOINT_PATH.');
  }

  if (!exists(resolvedPptxPath)) {
    throw new Error(`PPTX file not found: ${resolvedPptxPath}`);
  }

  mkdirSync(path.dirname(resolvedScreenshotPath), { recursive: true });
  const script = buildPowerPointExportScript({
    pptxPath: resolvedPptxPath,
    screenshotPath: resolvedScreenshotPath,
    width,
    height
  });
  const run = spawn('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    script
  ], {
    encoding: 'utf8'
  });

  if (run.error) {
    throw new Error(`PowerPoint visual export failed to start: ${run.error.message}`);
  }

  if (run.status !== 0) {
    const detail = String(run.stderr || run.stdout || '').trim().slice(0, 2000);
    throw new Error(`PowerPoint visual export failed with status ${run.status}${detail ? `: ${detail}` : ''}`);
  }

  if (!exists(resolvedScreenshotPath)) {
    throw new Error(`PowerPoint visual export did not create a screenshot: ${resolvedScreenshotPath}`);
  }

  const screenshotBytes = statSync(resolvedScreenshotPath).size;
  if (screenshotBytes < 1) {
    throw new Error(`PowerPoint visual export created an empty screenshot: ${resolvedScreenshotPath}`);
  }

  const image = inspectPngFile(resolvedScreenshotPath);

  return {
    ok: true,
    renderer: 'powerpoint',
    pptxPath: resolvedPptxPath,
    powerPointPath: resolvedPowerPointPath,
    screenshotPath: resolvedScreenshotPath,
    screenshotBytes,
    ...image,
    width: Number(width),
    height: Number(height)
  };
}
