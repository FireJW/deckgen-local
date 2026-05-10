import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const licenseCandidates = ['LICENSE', 'LICENSE.md', 'MIT-LICENSE'];
const templateCandidates = [
  path.join('assets', 'template.html'),
  path.join('templates', 'template.html'),
  'template.html'
];
const missingSourceNextStep = 'Provide a local guizang-ppt-skill checkout or extracted archive directory (extract archive files first), then rerun this preflight before template integration.';

const findExistingFile = (rootPath, candidates) => {
  for (const candidate of candidates) {
    const filePath = path.join(rootPath, candidate);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      return filePath;
    }
  }
  return '';
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

  if (!statSync(resolvedPath).isDirectory()) {
    return {
      ok: false,
      sourcePath: resolvedPath,
      error: `guizang-ppt-skill source path is not a directory: ${resolvedPath}`
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
