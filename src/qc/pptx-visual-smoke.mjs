import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const defaultPowerPointPaths = [
  'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE',
  'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\POWERPNT.EXE'
];

const errorMessage = (error) =>
  String(error?.message ?? error ?? 'Unknown PowerPoint visual smoke failure.');

export function classifyPptxVisualSmokeError(error) {
  const message = errorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes('80070520') || lower.includes('specified logon session')) {
    return {
      error_code: 'interactive_logon_required',
      error: message,
      next_step: 'Run this visual smoke from an interactive Windows logon session; sandbox or service tokens cannot automate PowerPoint COM.'
    };
  }

  if (lower.includes('powerpoint executable not found')) {
    return {
      error_code: 'powerpoint_not_found',
      error: message,
      next_step: 'Install Microsoft PowerPoint, pass --powerpoint-executable, or set DECKGEN_POWERPOINT_PATH.'
    };
  }

  if (lower.includes('failed to start')) {
    return {
      error_code: 'export_start_failed',
      error: message,
      next_step: 'Confirm powershell.exe is available and PowerPoint automation is allowed in this Windows session.'
    };
  }

  if (lower.includes('did not create a screenshot')) {
    return {
      error_code: 'screenshot_missing',
      error: message,
      next_step: 'Open the PPTX in PowerPoint and confirm PowerPoint export permissions and that the screenshot directory is writable.'
    };
  }

  if (lower.includes('created an empty screenshot')) {
    return {
      error_code: 'screenshot_empty',
      error: message,
      next_step: 'Rerun the visual smoke in an interactive Windows session and inspect the exported slide manually.'
    };
  }

  if (lower.includes('not a png')) {
    return {
      error_code: 'screenshot_invalid_png',
      error: message,
      next_step: 'Remove the stale screenshot artifact and rerun PowerPoint export to produce a PNG screenshot.'
    };
  }

  if (lower.includes('nearly blank')) {
    return {
      error_code: 'screenshot_blank',
      error: message,
      next_step: 'Open the PPTX and exported screenshot manually to verify the selected slide rendered non-empty content.'
    };
  }

  if (lower.includes('failed with status')) {
    return {
      error_code: 'export_failed',
      error: message,
      next_step: 'Check the PowerPoint error details and rerun from an interactive Windows logon session.'
    };
  }

  return {
    error_code: 'powerpoint_visual_failed',
    error: message,
    next_step: 'Inspect the PowerPoint visual smoke output and rerun with an interactive Windows logon session if COM automation is involved.'
  };
}

export function buildPptxVisualSmokeFailure(error, context = {}) {
  const classified = classifyPptxVisualSmokeError(error);
  const detail = `${classified.error_code}: ${classified.error}${classified.next_step ? ` Next: ${classified.next_step}` : ''}`;
  return {
    ok: false,
    renderer: 'powerpoint',
    ...context,
    ...classified,
    errors: [detail]
  };
}

const psQuote = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;

const normalizeSlideNumber = (value) => {
  const slideNumber = Number(value ?? 1);
  if (!Number.isInteger(slideNumber) || slideNumber < 1) {
    throw new Error('slideNumber must be a positive integer.');
  }
  return slideNumber;
};

const normalizeSlideNumbers = (values) => {
  if (!Array.isArray(values) || values.length < 1) {
    throw new Error('slideNumbers must contain at least one slide number.');
  }

  return values.map((value) => normalizeSlideNumber(value));
};

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

export function buildPowerPointExportScript({
  pptxPath,
  screenshotPath,
  slideNumber = 1,
  width = 1600,
  height = 900
} = {}) {
  const resolvedSlideNumber = normalizeSlideNumber(slideNumber);
  return [
    "$ErrorActionPreference = 'Stop'",
    `$pptx = ${psQuote(pptxPath)}`,
    `$out = ${psQuote(screenshotPath)}`,
    '$app = $null',
    '$presentation = $null',
    'try {',
    '  $app = New-Object -ComObject PowerPoint.Application',
    '  $presentation = $app.Presentations.Open($pptx, -1, 0, 0)',
    `  $presentation.Slides.Item(${resolvedSlideNumber}).Export($out, 'PNG', ${Number(width)}, ${Number(height)})`,
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

export function buildPowerPointExportSlidesScript({
  pptxPath,
  exports,
  width = 1600,
  height = 900
} = {}) {
  const exportItems = Array.isArray(exports) ? exports : [];
  if (exportItems.length < 1) {
    throw new Error('exports must contain at least one slide export.');
  }

  const exportLines = exportItems.map((item) => {
    const slideNumber = normalizeSlideNumber(item?.slideNumber);
    return `  $presentation.Slides.Item(${slideNumber}).Export(${psQuote(item?.screenshotPath)}, 'PNG', ${Number(width)}, ${Number(height)})`;
  });

  return [
    "$ErrorActionPreference = 'Stop'",
    `$pptx = ${psQuote(pptxPath)}`,
    '$app = $null',
    '$presentation = $null',
    'try {',
    '  $app = New-Object -ComObject PowerPoint.Application',
    '  $presentation = $app.Presentations.Open($pptx, -1, 0, 0)',
    ...exportLines,
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

export function defaultPptxScreenshotPath(pptxPath, cwd = process.cwd(), slideNumber = 1, stamp = new Date().toISOString().replace(/[:.]/g, '-')) {
  const resolvedSlideNumber = normalizeSlideNumber(slideNumber);
  const basename = path.basename(pptxPath ?? 'deck.pptx', path.extname(pptxPath ?? 'deck.pptx'));
  return path.resolve(cwd, '.tmp', 'deckgen-pptx-visual-smoke', `${basename}-${stamp}-slide${resolvedSlideNumber}.png`);
}

export function inspectPngFile(filePath) {
  const resolvedPath = path.resolve(filePath ?? '');
  const buffer = readFileSync(resolvedPath);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(`Screenshot is not a PNG file: ${resolvedPath}`);
  }

  const colorTypeChannels = new Map([
    [0, 1],
    [2, 3],
    [3, 1],
    [4, 2],
    [6, 4]
  ]);
  const paethPredictor = (left, up, upLeft) => {
    const p = left + up - upLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upLeft);
    if (pa <= pb && pa <= pc) return left;
    if (pb <= pc) return up;
    return upLeft;
  };
  const unfilterRow = (filterType, row, prevRow, bytesPerPixel) => {
    const output = Buffer.alloc(row.length);
    for (let index = 0; index < row.length; index += 1) {
      const raw = row[index];
      const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
      const up = prevRow[index] ?? 0;
      const upLeft = index >= bytesPerPixel ? prevRow[index - bytesPerPixel] ?? 0 : 0;
      let value;

      switch (filterType) {
        case 0:
          value = raw;
          break;
        case 1:
          value = (raw + left) & 0xff;
          break;
        case 2:
          value = (raw + up) & 0xff;
          break;
        case 3:
          value = (raw + Math.floor((left + up) / 2)) & 0xff;
          break;
        case 4:
          value = (raw + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Screenshot PNG uses unsupported filter type ${filterType}: ${resolvedPath}`);
      }

      output[index] = value;
    }
    return output;
  };

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatParts = [];
  let seenIend = false;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const nextOffset = dataEnd + 4;

    if (nextOffset > buffer.length) {
      throw new Error(`Screenshot PNG is truncated: ${resolvedPath}`);
    }

    if (chunkType === 'IHDR') {
      if (length !== 13) {
        throw new Error(`Screenshot PNG is missing an IHDR header: ${resolvedPath}`);
      }
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    } else if (chunkType === 'IDAT') {
      idatParts.push(buffer.subarray(dataStart, dataEnd));
    } else if (chunkType === 'IEND') {
      seenIend = true;
      break;
    }

    offset = nextOffset;
  }

  if (!seenIend) {
    throw new Error(`Screenshot PNG is missing an IEND chunk: ${resolvedPath}`);
  }

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Screenshot PNG has invalid dimensions: ${resolvedPath}`);
  }

  if (bitDepth !== 8) {
    throw new Error(`Screenshot PNG uses unsupported bit depth ${bitDepth}: ${resolvedPath}`);
  }

  const bytesPerPixel = colorTypeChannels.get(colorType);
  if (!bytesPerPixel) {
    throw new Error(`Screenshot PNG uses unsupported color type ${colorType}: ${resolvedPath}`);
  }

  if (idatParts.length < 1) {
    throw new Error(`Screenshot PNG is missing image data: ${resolvedPath}`);
  }

  const inflated = inflateSync(Buffer.concat(idatParts));
  const rowLength = width * bytesPerPixel;
  const expectedLength = height * (rowLength + 1);
  if (inflated.length < expectedLength) {
    throw new Error(`Screenshot PNG image data is truncated: ${resolvedPath}`);
  }

  const colorCounts = new Map();
  let totalPixels = 0;
  let dominantColorCount = 0;
  let prevRow = Buffer.alloc(rowLength);

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const rowOffset = rowIndex * (rowLength + 1);
    const filterType = inflated[rowOffset];
    const row = inflated.subarray(rowOffset + 1, rowOffset + 1 + rowLength);
    const recon = unfilterRow(filterType, row, prevRow, bytesPerPixel);

    for (let pixelIndex = 0; pixelIndex < width; pixelIndex += 1) {
      const pixelOffset = pixelIndex * bytesPerPixel;
      const key = colorType === 3
        ? `index:${recon[pixelOffset]}`
        : `${recon[pixelOffset]},${recon[pixelOffset + 1] ?? 0},${recon[pixelOffset + 2] ?? 0},${recon[pixelOffset + 3] ?? 255}`;
      const nextCount = (colorCounts.get(key) ?? 0) + 1;
      colorCounts.set(key, nextCount);
      if (nextCount > dominantColorCount) {
        dominantColorCount = nextCount;
      }
      totalPixels += 1;
    }

    prevRow = recon;
  }

  const imageWidth = width;
  const imageHeight = height;
  const pixelUniqueColorCount = colorCounts.size;
  const pixelBlankRatio = totalPixels > 0 ? 1 - (dominantColorCount / totalPixels) : 1;
  if (pixelUniqueColorCount < 2 || pixelBlankRatio < 0.001) {
    throw new Error(`Screenshot PNG appears nearly blank: ${resolvedPath}`);
  }

  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth < 1 || imageHeight < 1) {
    throw new Error(`Screenshot PNG has invalid dimensions: ${resolvedPath}`);
  }

  return {
    screenshotMime: 'image/png',
    imageWidth,
    imageHeight,
    pixelUniqueColorCount,
    pixelDominantColorCount: dominantColorCount,
    pixelBlankRatio
  };
}

const inspectScreenshotResult = ({ pptxPath, screenshotPath, slideNumber, width, height }) => {
  const resolvedScreenshotPath = path.resolve(screenshotPath ?? '');
  if (!existsSync(resolvedScreenshotPath)) {
    throw new Error(`PowerPoint visual export did not create a screenshot: ${resolvedScreenshotPath}`);
  }

  const screenshotBytes = statSync(resolvedScreenshotPath).size;
  if (screenshotBytes < 1) {
    throw new Error(`PowerPoint visual export created an empty screenshot: ${resolvedScreenshotPath}`);
  }

  const image = inspectPngFile(resolvedScreenshotPath);

  return {
    pptxPath,
    slideNumber,
    screenshotPath: resolvedScreenshotPath,
    screenshotBytes,
    ...image,
    width: Number(width),
    height: Number(height)
  };
};

export function exportSlidesWithPowerPoint(options = {}) {
  const {
    pptxPath,
    powerPointPath,
    slideNumbers,
    screenshotPathForSlide,
    width = 1600,
    height = 900,
    exists = existsSync,
    spawn = spawnSync
  } = options;
  const resolvedSlideNumbers = normalizeSlideNumbers(slideNumbers);
  const resolvedPptxPath = path.resolve(pptxPath ?? '');
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

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exports = resolvedSlideNumbers.map((slideNumber) => {
    const screenshotPath = path.resolve(
      typeof screenshotPathForSlide === 'function'
        ? screenshotPathForSlide(slideNumber)
        : defaultPptxScreenshotPath(resolvedPptxPath, process.cwd(), slideNumber, stamp)
    );
    mkdirSync(path.dirname(screenshotPath), { recursive: true });
    return { slideNumber, screenshotPath };
  });

  const script = buildPowerPointExportSlidesScript({
    pptxPath: resolvedPptxPath,
    exports,
    width,
    height
  });
  const run = spawn('powershell.exe', [
    '-NoProfile',
    '-Sta',
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

  return {
    ok: true,
    renderer: 'powerpoint',
    pptxPath: resolvedPptxPath,
    powerPointPath: resolvedPowerPointPath,
    slideNumbers: resolvedSlideNumbers,
    slideCount: resolvedSlideNumbers.length,
    screenshots: exports.map((item) => inspectScreenshotResult({
      pptxPath: resolvedPptxPath,
      screenshotPath: item.screenshotPath,
      slideNumber: item.slideNumber,
      width,
      height
    }))
  };
}

export function exportFirstSlideWithPowerPoint(options = {}) {
  const {
    pptxPath,
    screenshotPath,
    powerPointPath,
    slideNumber = 1,
    width = 1600,
    height = 900,
    exists = existsSync,
    spawn = spawnSync
  } = options;
  const resolvedSlideNumber = normalizeSlideNumber(slideNumber);
  const resolvedPptxPath = path.resolve(pptxPath ?? '');
  const resolvedScreenshotPath = path.resolve(screenshotPath ?? defaultPptxScreenshotPath(resolvedPptxPath, process.cwd(), resolvedSlideNumber));
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
    slideNumber: resolvedSlideNumber,
    width,
    height
  });
  const run = spawn('powershell.exe', [
    '-NoProfile',
    '-Sta',
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
    slideNumber: resolvedSlideNumber,
    screenshotPath: resolvedScreenshotPath,
    screenshotBytes,
    ...image,
    width: Number(width),
    height: Number(height)
  };
}
