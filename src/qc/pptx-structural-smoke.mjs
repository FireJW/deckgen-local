import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const findEndOfCentralDirectory = (buffer) => {
  const earliestOffset = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= earliestOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
};

export function inspectPptxFile(filePath) {
  const resolvedPath = path.resolve(filePath ?? '');
  try {
    if (!existsSync(resolvedPath)) {
      return { ok: false, path: resolvedPath, error: 'file does not exist' };
    }

    const stats = statSync(resolvedPath);
    if (!stats.isFile()) {
      return { ok: false, path: resolvedPath, error: 'path is not a file' };
    }

    const buffer = readFileSync(resolvedPath);
    const eocdOffset = findEndOfCentralDirectory(buffer);
    if (eocdOffset < 0 || eocdOffset + 22 > buffer.length) {
      return { ok: false, path: resolvedPath, error: 'missing end of central directory' };
    }

    const entryCount = buffer.readUInt16LE(eocdOffset + 10);
    let cursor = buffer.readUInt32LE(eocdOffset + 16);
    const names = [];

    for (let index = 0; index < entryCount; index += 1) {
      if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
        return { ok: false, path: resolvedPath, error: 'invalid central directory entry' };
      }

      const nameLength = buffer.readUInt16LE(cursor + 28);
      const extraLength = buffer.readUInt16LE(cursor + 30);
      const commentLength = buffer.readUInt16LE(cursor + 32);
      const nameStart = cursor + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > buffer.length) {
        return { ok: false, path: resolvedPath, error: 'invalid central directory name' };
      }

      names.push(buffer.toString('utf8', nameStart, nameEnd).replaceAll('\\', '/'));
      cursor = nameEnd + extraLength + commentLength;
    }

    const hasContentTypes = names.includes('[Content_Types].xml');
    const hasPresentation = names.includes('ppt/presentation.xml');
    if (!hasContentTypes || !hasPresentation) {
      return {
        ok: false,
        path: resolvedPath,
        error: 'missing required presentation entries',
        hasContentTypes,
        hasPresentation,
        slideCount: names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).length
      };
    }

    return {
      ok: true,
      path: resolvedPath,
      bytes: stats.size,
      entryCount,
      hasContentTypes,
      hasPresentation,
      slideCount: names.filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).length
    };
  } catch (error) {
    return { ok: false, path: resolvedPath, error: error.message };
  }
}

export function findLatestPptxArtifact(exportsDir) {
  const resolvedDir = path.resolve(exportsDir ?? '');
  if (!existsSync(resolvedDir)) {
    throw new Error(`PPTX exports directory not found: ${resolvedDir}`);
  }

  const stats = statSync(resolvedDir);
  if (!stats.isDirectory()) {
    throw new Error(`PPTX exports path is not a directory: ${resolvedDir}`);
  }

  const candidates = readdirSync(resolvedDir)
    .filter((entry) => entry.toLowerCase().endsWith('.pptx'))
    .map((entry) => {
      const filePath = path.join(resolvedDir, entry);
      const fileStats = statSync(filePath);
      return { filePath, fileStats };
    })
    .filter(({ fileStats }) => fileStats.isFile())
    .sort((left, right) => right.fileStats.mtimeMs - left.fileStats.mtimeMs || left.filePath.localeCompare(right.filePath));

  if (candidates.length === 0) {
    throw new Error(`No PPTX artifacts found in exports directory: ${resolvedDir}`);
  }

  return candidates[0].filePath;
}

export function findLatestPptxArtifactForRunDir(runDir) {
  const resolvedRunDir = path.resolve(runDir ?? '');
  if (!existsSync(resolvedRunDir)) {
    throw new Error(`Deckgen run directory not found: ${resolvedRunDir}`);
  }

  const stats = statSync(resolvedRunDir);
  if (!stats.isDirectory()) {
    throw new Error(`Deckgen run path is not a directory: ${resolvedRunDir}`);
  }

  return findLatestPptxArtifact(path.join(resolvedRunDir, 'ppt-master', 'exports'));
}

export function inferExpectedSlidesForRunDir(runDir) {
  const contractPath = path.join(path.resolve(runDir ?? ''), 'deck_contract.json');
  if (!existsSync(contractPath)) {
    return undefined;
  }

  try {
    const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
    if (Number.isInteger(contract?.target_slide_count) && contract.target_slide_count > 0) {
      return contract.target_slide_count;
    }
    if (Array.isArray(contract?.slides) && contract.slides.length > 0) {
      return contract.slides.length;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function validatePptxSmokeResult(summary = {}, options = {}) {
  const errors = [];
  if (!summary.ok) {
    errors.push(`invalid pptx: ${summary.error ?? 'unknown error'}`);
  }

  if (options.expectedSlides !== undefined) {
    const expectedSlides = Number(options.expectedSlides);
    if (!Number.isInteger(expectedSlides) || expectedSlides < 1) {
      errors.push('expected slide count must be a positive integer');
    } else if (summary.slideCount !== expectedSlides) {
      errors.push(`slide count ${summary.slideCount ?? 0} does not match expected ${expectedSlides}`);
    }
  }

  if (summary.ok && summary.bytes === 0) {
    errors.push('pptx file is empty');
  }

  return { ok: errors.length === 0, errors };
}
