import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const licenseCandidates = ['LICENSE', 'LICENSE.md', 'MIT-LICENSE'];
const templateCandidates = [
  path.join('assets', 'template.html'),
  path.join('templates', 'template.html'),
  'template.html'
];
const missingSourceNextStep = 'Provide a local guizang-ppt-skill checkout, extracted archive directory, or .zip archive, then rerun this preflight before template integration.';

const findExistingFile = (rootPath, candidates) => {
  for (const candidate of candidates) {
    const filePath = path.join(rootPath, candidate);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return filePath;
    }
  }
  return '';
};

const normalizeZipEntryName = (value) =>
  String(value ?? '')
    .replaceAll('\\', '/')
    .replace(/^\/+/, '');

const normalizeCandidate = (value) => normalizeZipEntryName(value);

const findZipEndRecordOffset = (buffer) => {
  const minimumEndRecordLength = 22;
  const maximumCommentLength = 0xffff;
  const searchStart = Math.max(0, buffer.length - minimumEndRecordLength - maximumCommentLength);

  for (let offset = buffer.length - minimumEndRecordLength; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
};

const listZipEntries = (archivePath) => {
  const buffer = readFileSync(archivePath);
  const endRecordOffset = findZipEndRecordOffset(buffer);
  if (endRecordOffset < 0) {
    throw new Error('missing zip end record');
  }

  const centralDirectorySize = buffer.readUInt32LE(endRecordOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endRecordOffset + 16);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (centralDirectoryOffset < 0 || centralDirectoryEnd > buffer.length) {
    throw new Error('invalid zip central directory');
  }

  const entries = [];
  let cursor = centralDirectoryOffset;
  while (cursor < centralDirectoryEnd) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('invalid zip central directory header');
    }

    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) {
      throw new Error('invalid zip entry name');
    }

    entries.push(normalizeZipEntryName(buffer.toString('utf8', nameStart, nameEnd)));
    cursor = nameEnd + extraLength + commentLength;
  }

  return entries;
};

const detectArchiveRoot = (entries) => {
  const fileEntries = entries.filter((entry) => entry && !entry.endsWith('/'));
  const topLevelSegments = new Set();
  for (const entry of fileEntries) {
    const firstSlash = entry.indexOf('/');
    if (firstSlash < 0) {
      return '';
    }
    topLevelSegments.add(entry.slice(0, firstSlash));
  }

  return topLevelSegments.size === 1 ? `${Array.from(topLevelSegments)[0]}/` : '';
};

const findZipEntry = (entries, candidates, archiveRoot) => {
  const fileEntries = entries.filter((entry) => entry && !entry.endsWith('/'));
  const candidateEntries = candidates.flatMap((candidate) => {
    const normalized = normalizeCandidate(candidate);
    return archiveRoot ? [`${archiveRoot}${normalized}`, normalized] : [normalized];
  });

  for (const candidate of candidateEntries) {
    const hit = fileEntries.find((entry) => entry.toLowerCase() === candidate.toLowerCase());
    if (hit) {
      return hit;
    }
  }

  return '';
};

const archiveEntryPath = (archivePath, entryName) => `${archivePath}!/${entryName}`;

const inspectGuizangZipArchive = (resolvedPath) => {
  let entries;
  try {
    entries = listZipEntries(resolvedPath);
  } catch (error) {
    return {
      ok: false,
      sourceKind: 'zip-archive',
      sourcePath: resolvedPath,
      error: `guizang-ppt-skill source zip could not be inspected: ${resolvedPath} (${error.message})`
    };
  }

  const archiveRoot = detectArchiveRoot(entries);
  const licenseEntry = findZipEntry(entries, licenseCandidates, archiveRoot);
  if (!licenseEntry) {
    return {
      ok: false,
      sourceKind: 'zip-archive',
      sourcePath: resolvedPath,
      archiveRoot,
      error: `guizang-ppt-skill source zip is missing a license file: ${resolvedPath}`
    };
  }

  const templateEntry = findZipEntry(entries, templateCandidates, archiveRoot);
  if (!templateEntry) {
    return {
      ok: false,
      sourceKind: 'zip-archive',
      sourcePath: resolvedPath,
      archiveRoot,
      licensePath: archiveEntryPath(resolvedPath, licenseEntry),
      error: `guizang-ppt-skill source zip is missing a supported template file under ${resolvedPath}`
    };
  }

  return {
    ok: true,
    sourceKind: 'zip-archive',
    sourcePath: resolvedPath,
    archiveRoot,
    licensePath: archiveEntryPath(resolvedPath, licenseEntry),
    templatePath: archiveEntryPath(resolvedPath, templateEntry),
    vendoredFiles: []
  };
};

export function inspectGuizangSourcePath(sourcePath) {
  const resolvedPath = path.resolve(sourcePath ?? '');

  if (!existsSync(resolvedPath)) {
    return {
      ok: false,
      sourcePath: resolvedPath,
      error: `guizang-ppt-skill source path not found: ${resolvedPath}`
    };
  }

  const sourceStat = statSync(resolvedPath);
  if (sourceStat.isFile() && path.extname(resolvedPath).toLowerCase() === '.zip') {
    return inspectGuizangZipArchive(resolvedPath);
  }

  if (!sourceStat.isDirectory()) {
    return {
      ok: false,
      sourcePath: resolvedPath,
      error: `guizang-ppt-skill source path is not a directory or supported .zip archive: ${resolvedPath}`
    };
  }

  const licensePath = findExistingFile(resolvedPath, licenseCandidates);
  if (!licensePath) {
    return {
      ok: false,
      sourcePath: resolvedPath,
      error: `guizang-ppt-skill source is missing a license file: ${resolvedPath}`
    };
  }

  const templatePath = findExistingFile(resolvedPath, templateCandidates);
  if (!templatePath) {
    return {
      ok: false,
      sourcePath: resolvedPath,
      licensePath,
      error: `guizang-ppt-skill source is missing a supported template file under ${resolvedPath}`
    };
  }

  return {
    ok: true,
    sourceKind: 'directory',
    sourcePath: resolvedPath,
    licensePath,
    templatePath,
    vendoredFiles: []
  };
}

export function buildGuizangPreflightResult(sourcePath) {
  const inspection = inspectGuizangSourcePath(sourcePath);
  return {
    ...inspection,
    integration: inspection.ok ? 'source-ready-no-files-vendored' : 'blocked-no-files-vendored',
    next_step: inspection.ok
      ? 'Review license/template scope before copying any upstream file and update third_party/NOTICE.md if files are vendored.'
      : missingSourceNextStep
  };
}
