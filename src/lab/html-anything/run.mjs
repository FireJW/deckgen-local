import { randomUUID as defaultRandomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadSourcePackage } from '../../cli/source-loader.mjs';
import { evaluateHtmlAnythingTemplate } from './evaluate.mjs';
import { buildHtmlAnythingLabReport } from './report.mjs';
import { loadHtmlAnythingTemplateIndex, validateHtmlAnythingTemplateIndex } from './template-index.mjs';

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const timestampRunIdPart = (date) => date.toISOString().replace(/[:.]/g, '-');

export function createHtmlAnythingLabRunDirectory(workdir, options = {}) {
  const now = options.now ?? (() => new Date());
  const randomUUID = options.randomUUID ?? defaultRandomUUID;
  const runRoot = path.resolve(workdir, '.tmp', 'html-anything-lab');
  mkdirSync(runRoot, { recursive: true });
  const runId = `${timestampRunIdPart(now())}-${randomUUID()}`;
  const runDir = path.join(runRoot, runId);
  mkdirSync(runDir);
  return { runId, runDir };
}

export function loadHtmlAnythingLabRun({ workdir, templateIndexPath, sourcePaths, now, randomUUID }) {
  const index = loadHtmlAnythingTemplateIndex(templateIndexPath);
  const validation = validateHtmlAnythingTemplateIndex(index);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const sources = sourcePaths.map((sourcePath) => loadSourcePackage({ source: sourcePath }));
  const { runId, runDir } = createHtmlAnythingLabRunDirectory(workdir, { now, randomUUID });
  const results = sources.map((sourcePackage) => ({
    sourcePath: sourcePackage.sourcePath,
    sourceType: sourcePackage.sourceType,
    profile: sourcePackage.profile,
    templateResults: validation.templates.map((template) => evaluateHtmlAnythingTemplate({ template, sourcePackage }))
  }));

  const report = buildHtmlAnythingLabReport({ runId, index, results });
  writeJson(path.join(runDir, 'request.json'), {
    command: 'html-anything-lab',
    templateIndexPath,
    sourcePaths
  });
  writeJson(path.join(runDir, 'upstream-template-index.json'), index);
  writeFileSync(path.join(runDir, 'report.md'), report, 'utf8');
  writeJson(path.join(runDir, 'run_result.json'), {
    ok: true,
    runId,
    runDir,
    reportPath: path.join(runDir, 'report.md')
  });

  return { ok: true, runId, runDir, reportPath: path.join(runDir, 'report.md') };
}
