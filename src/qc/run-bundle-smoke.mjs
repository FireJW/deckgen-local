import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeckContract } from '../contract/validate.mjs';
import { findHtmlArtifactForRunDir } from './html-visual-smoke.mjs';
import {
  findLatestPptxArtifactForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from './pptx-structural-smoke.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const comparablePath = (candidatePath) => {
  const resolvedPath = path.resolve(candidatePath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
};
const isPathInside = (parentDir, candidatePath) => {
  const relativePath = path.relative(path.resolve(parentDir), path.resolve(candidatePath));
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
};
const defaultRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const fileSummary = (filePath) => {
  const resolvedPath = path.resolve(filePath);
  try {
    if (!existsSync(resolvedPath)) {
      return { ok: false, path: resolvedPath, error: 'file does not exist' };
    }

    const stats = statSync(resolvedPath);
    if (!stats.isFile()) {
      return { ok: false, path: resolvedPath, error: 'path is not a file' };
    }

    return { ok: true, path: resolvedPath, bytes: stats.size };
  } catch (error) {
    return { ok: false, path: resolvedPath, error: error.message };
  }
};

const parseJsonFile = (filePath) => {
  const file = fileSummary(filePath);
  if (!file.ok) {
    return { ...file, validation: { ok: false, errors: [file.error] } };
  }

  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!isObject(data)) {
      return {
        ...file,
        ok: false,
        validation: { ok: false, errors: ['json root must be an object'] }
      };
    }

    return {
      ...file,
      validation: { ok: true, errors: [] },
      data
    };
  } catch (error) {
    return {
      ...file,
      ok: false,
      validation: { ok: false, errors: [`invalid json: ${error.message}`] }
    };
  }
};

const parseContract = (contractPath) => {
  const file = fileSummary(contractPath);
  if (!file.ok) {
    return { ...file, validation: { ok: false, errors: [file.error] } };
  }

  try {
    const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
    const validation = validateDeckContract(contract);
    return {
      ...file,
      validation: validation.ok ? { ok: true, errors: [] } : { ok: false, errors: [validation.error] },
      title: typeof contract.title === 'string' ? contract.title : undefined,
      outputs: Array.isArray(contract.outputs) ? contract.outputs : [],
      sourceRefs: Array.isArray(contract.source_refs) ? contract.source_refs : [],
      targetSlideCount: Number.isInteger(contract.target_slide_count) ? contract.target_slide_count : undefined,
      slideCount: Array.isArray(contract.slides) ? contract.slides.length : undefined
    };
  } catch (error) {
    return {
      ...file,
      ok: false,
      validation: { ok: false, errors: [`invalid contract json: ${error.message}`] }
    };
  }
};

const inspectHtmlOutput = (runDir, required) => {
  if (!required) {
    return { required, ok: true };
  }

  try {
    const htmlPath = findHtmlArtifactForRunDir(runDir);
    return { required, ...fileSummary(htmlPath) };
  } catch (error) {
    return {
      required,
      ok: false,
      path: path.join(path.resolve(runDir), 'html', 'index.html'),
      error: error.message
    };
  }
};

const inspectPptxOutput = (runDir, required, expectedSlides, expectedText) => {
  if (!required) {
    return { required, ok: true };
  }

  try {
    const pptxPath = findLatestPptxArtifactForRunDir(runDir);
    const pptx = inspectPptxFile(pptxPath);
    const validation = validatePptxSmokeResult(pptx, { expectedSlides, expectedText });
    return {
      required,
      ...pptx,
      validation,
      ok: validation.ok
    };
  } catch (error) {
    return {
      required,
      ok: false,
      path: path.join(path.resolve(runDir), 'ppt-master', 'exports'),
      validation: { ok: false, errors: [error.message] },
      error: error.message
    };
  }
};

export function inspectDeckRunBundle({ runDir, pptxExpectedText = [] } = {}) {
  const resolvedRunDir = path.resolve(runDir ?? '');
  const runDirExists = existsSync(resolvedRunDir);
  const runDirOk = runDirExists && statSync(resolvedRunDir).isDirectory();
  const contract = parseContract(path.join(resolvedRunDir, 'deck_contract.json'));
  const expectedOutputs = contract.validation?.ok ? contract.outputs : [];
  const expectedSlides = contract.validation?.ok ? contract.slideCount : undefined;

  return {
    runDir: resolvedRunDir,
    runDirOk,
    expectedOutputs,
    expectedSlides,
    request: parseJsonFile(path.join(resolvedRunDir, 'request.json')),
    runResult: parseJsonFile(path.join(resolvedRunDir, 'run_result.json')),
    sourceManifest: parseJsonFile(path.join(resolvedRunDir, 'source_manifest.json')),
    contract,
    content: fileSummary(path.join(resolvedRunDir, 'content.md')),
    qcReport: fileSummary(path.join(resolvedRunDir, 'qc_report.md')),
    html: inspectHtmlOutput(resolvedRunDir, expectedOutputs.includes('html')),
    pptx: inspectPptxOutput(resolvedRunDir, expectedOutputs.includes('pptx'), expectedSlides, pptxExpectedText)
  };
}

const appendOption = (args, flag, value) => {
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    args.push(flag, String(value));
  }
};

const appendRepeatedOptions = (args, flag, values = []) => {
  for (const value of Array.isArray(values) ? values : [values]) {
    appendOption(args, flag, value);
  }
};

const includesSourceManifestPrimaryPath = (sourceRefs = [], primaryPath) => sourceRefs.some((sourceRef) =>
  isObject(sourceRef) &&
  sourceRef.type === 'local_file' &&
  typeof sourceRef.path === 'string' &&
  sourceRef.path.trim() !== '' &&
  comparablePath(sourceRef.path) === comparablePath(primaryPath)
);

const parseVisualSmokeStdout = (stdout) => {
  const text = String(stdout ?? '').trim();
  if (!text) {
    return { data: undefined, error: 'visual smoke stdout is empty' };
  }

  try {
    return { data: JSON.parse(text), error: undefined };
  } catch {
    return { data: undefined, error: 'invalid json in visual smoke stdout' };
  }
};

const structuredVisualSmokeError = (data) => {
  if (!isObject(data) || typeof data.error !== 'string' || data.error.trim() === '') {
    return '';
  }

  const code = typeof data.error_code === 'string' && data.error_code.trim() !== ''
    ? `${data.error_code.trim()}: `
    : '';
  const nextStep = typeof data.next_step === 'string' && data.next_step.trim() !== ''
    ? ` Next: ${data.next_step.trim()}`
    : '';
  return `${code}${data.error.trim()}${nextStep}`;
};

const runVisualSmokeCommand = ({ command, args, cwd, spawn }) => {
  const run = spawn(command, args, { encoding: 'utf8', cwd });
  const parsed = parseVisualSmokeStdout(run.stdout);
  const data = parsed.data;
  const structuredError = structuredVisualSmokeError(data);
  const errors = Array.isArray(data?.errors)
    ? data.errors
    : structuredError
      ? [structuredError]
    : [];
  const error = run.error?.message ?? (run.status === 0
    ? parsed.error ?? (data?.ok === true ? undefined : 'visual smoke stdout did not report ok: true')
    : structuredError || String(run.stderr || run.stdout || '').trim());

  return {
    required: true,
    ok: run.status === 0 && data?.ok === true,
    command,
    args,
    status: run.status,
    stdout: run.stdout ?? '',
    stderr: run.stderr ?? '',
    data,
    errors,
    error
  };
};

export function runDeckRunVisualSmokeGates({
  runDir,
  expectedOutputs = [],
  includeHtmlVisual = false,
  includePptxVisual = false,
  htmlVisualOptions = {},
  pptxVisualOptions = {},
  nodePath = process.execPath,
  rootDir = defaultRootDir,
  cwd = rootDir,
  spawn = spawnSync
} = {}) {
  const resolvedRunDir = path.resolve(runDir ?? '');
  const htmlRequired = includeHtmlVisual && expectedOutputs.includes('html');
  const pptxRequired = includePptxVisual && expectedOutputs.includes('pptx');
  const visual = {
    html: {
      required: htmlRequired,
      ok: true,
      skipped: !htmlRequired,
      reason: htmlRequired ? undefined : 'html visual smoke was not requested or html output is not required'
    },
    pptx: {
      required: pptxRequired,
      ok: true,
      skipped: !pptxRequired,
      reason: pptxRequired ? undefined : 'pptx visual smoke was not requested or pptx output is not required'
    }
  };

  if (htmlRequired) {
    const args = [
      path.join(path.resolve(rootDir), 'scripts', 'html-visual-smoke.mjs'),
      '--run-dir',
      resolvedRunDir
    ];
    appendOption(args, '--module-dir', htmlVisualOptions.moduleDir);
    appendOption(args, '--browser-executable', htmlVisualOptions.browserExecutable);
    appendOption(args, '--viewport', htmlVisualOptions.viewport);
    if (htmlVisualOptions.expectedTextFromContract) {
      args.push('--expected-text-from-contract');
    }
    appendRepeatedOptions(args, '--expected-text', htmlVisualOptions.expectedText);
    visual.html = runVisualSmokeCommand({
      command: nodePath,
      args,
      cwd,
      spawn
    });
  }

  if (pptxRequired) {
    const args = [
      path.join(path.resolve(rootDir), 'scripts', 'pptx-visual-smoke.mjs'),
      '--run-dir',
      resolvedRunDir
    ];
    if (pptxVisualOptions.allSlides) {
      args.push('--all-slides');
    } else {
      appendOption(args, '--slide', pptxVisualOptions.slide);
    }
    appendOption(args, '--powerpoint-executable', pptxVisualOptions.powerPointExecutable);
    if (pptxVisualOptions.expectedTextFromContract) {
      args.push('--expected-text-from-contract');
    }
    appendRepeatedOptions(args, '--expected-text', pptxVisualOptions.expectedText);
    visual.pptx = runVisualSmokeCommand({
      command: nodePath,
      args,
      cwd,
      spawn
    });
  }

  return visual;
}

export function validateDeckRunBundleSmokeResult(summary = {}) {
  const errors = [];

  if (!summary.runDirOk) {
    errors.push(`run directory not found or not a directory: ${summary.runDir ?? ''}`);
  }

  if (!summary.contract?.ok || !summary.contract?.validation?.ok) {
    errors.push(`deck_contract.json is invalid: ${(summary.contract?.validation?.errors ?? [summary.contract?.error ?? 'unknown error']).join('; ')}`);
  }

  if (!summary.request?.ok || !summary.request?.validation?.ok) {
    errors.push(`request.json is missing or invalid: ${(summary.request?.validation?.errors ?? [summary.request?.error ?? 'unknown error']).join('; ')}`);
  } else if (Array.isArray(summary.request.data.outputs) && Array.isArray(summary.expectedOutputs)) {
    const requestOutputs = [...summary.request.data.outputs].sort();
    const contractOutputs = [...summary.expectedOutputs].sort();
    if (JSON.stringify(requestOutputs) !== JSON.stringify(contractOutputs)) {
      errors.push(`request.json outputs ${requestOutputs.join(',')} do not match deck_contract.json outputs ${contractOutputs.join(',')}`);
    }
  }

  if (!summary.runResult?.ok || !summary.runResult?.validation?.ok) {
    errors.push(`run_result.json is missing or invalid: ${(summary.runResult?.validation?.errors ?? [summary.runResult?.error ?? 'unknown error']).join('; ')}`);
  } else {
    if (typeof summary.runResult.data.runDir !== 'string' || summary.runResult.data.runDir.trim() !== summary.runDir) {
      errors.push(`run_result.json runDir must match ${summary.runDir}`);
    }

    if (summary.request?.ok && summary.request?.validation?.ok) {
      for (const key of ['command', 'source_type', 'profile', 'output']) {
        if (summary.runResult.data[key] !== summary.request.data[key]) {
          errors.push(`run_result.json ${key} must match request.json ${key}`);
        }
      }
    }

    if (Array.isArray(summary.runResult.data.outputs) && Array.isArray(summary.expectedOutputs)) {
      const resultOutputs = [...summary.runResult.data.outputs].sort();
      const contractOutputs = [...summary.expectedOutputs].sort();
      if (JSON.stringify(resultOutputs) !== JSON.stringify(contractOutputs)) {
        errors.push(`run_result.json outputs ${resultOutputs.join(',')} do not match deck_contract.json outputs ${contractOutputs.join(',')}`);
      }
    }

    const expectedQcReportPath = path.join(summary.runDir, 'qc_report.md');
    if (typeof summary.runResult.data.qcReportPath !== 'string' || path.resolve(summary.runResult.data.qcReportPath) !== expectedQcReportPath) {
      errors.push(`run_result.json qcReportPath must match ${expectedQcReportPath}`);
    }

    if (summary.expectedOutputs.includes('html')) {
      const expectedHtmlPath = path.join(summary.runDir, 'html', 'index.html');
      if (typeof summary.runResult.data.htmlPath !== 'string' || path.resolve(summary.runResult.data.htmlPath) !== expectedHtmlPath) {
        errors.push(`run_result.json htmlPath must match ${expectedHtmlPath}`);
      }
    }

    if (summary.expectedOutputs.includes('pptx')) {
      const expectedPptxDir = path.join(summary.runDir, 'ppt-master', 'exports');
      if (!Array.isArray(summary.runResult.data.pptxPaths) || summary.runResult.data.pptxPaths.length === 0) {
        errors.push('run_result.json pptxPaths must contain at least one artifact path');
      } else {
        const resolvedRunResultPptxPaths = summary.runResult.data.pptxPaths.map((pptxPath) => path.resolve(pptxPath));
        for (const pptxPath of summary.runResult.data.pptxPaths) {
          const resolvedPptxPath = path.resolve(pptxPath);
          if (!isPathInside(expectedPptxDir, resolvedPptxPath)) {
            errors.push(`run_result.json pptxPaths must point inside ${expectedPptxDir}`);
            break;
          }

          const pptxFile = fileSummary(resolvedPptxPath);
          if (!pptxFile.ok) {
            errors.push(`run_result.json pptxPaths contains invalid artifact ${resolvedPptxPath}: ${pptxFile.error ?? 'unknown error'}`);
            break;
          }
        }

        if (
          summary.pptx?.ok &&
          typeof summary.pptx.path === 'string' &&
          !resolvedRunResultPptxPaths.includes(path.resolve(summary.pptx.path))
        ) {
          errors.push(`run_result.json pptxPaths must include validated pptx artifact ${summary.pptx.path}`);
        }
      }
    }
  }

  if (!summary.sourceManifest?.ok || !summary.sourceManifest?.validation?.ok) {
    errors.push(`source_manifest.json is missing or invalid: ${(summary.sourceManifest?.validation?.errors ?? [summary.sourceManifest?.error ?? 'unknown error']).join('; ')}`);
  } else if (!isObject(summary.sourceManifest.data.primary) || typeof summary.sourceManifest.data.primary.path !== 'string' || summary.sourceManifest.data.primary.path.trim() === '') {
    errors.push('source_manifest.json primary.path must be a non-empty string');
  } else if (
    summary.contract?.validation?.ok &&
    !includesSourceManifestPrimaryPath(summary.contract.sourceRefs, summary.sourceManifest.data.primary.path)
  ) {
    errors.push(`deck_contract.json source_refs must include source_manifest.json primary.path ${summary.sourceManifest.data.primary.path}`);
  }

  if (!summary.content?.ok) {
    errors.push(`content.md is missing or invalid: ${summary.content?.error ?? 'unknown error'}`);
  }

  if (!summary.qcReport?.ok) {
    errors.push(`qc_report.md is missing or invalid: ${summary.qcReport?.error ?? 'unknown error'}`);
  }

  if (summary.html?.required && !summary.html.ok) {
    errors.push(`html/index.html is missing or invalid: ${summary.html.error ?? 'unknown error'}`);
  }

  if (summary.pptx?.required && !summary.pptx.ok) {
    const pptxErrors = summary.pptx.validation?.errors?.length
      ? summary.pptx.validation.errors.join('; ')
      : summary.pptx.error ?? 'unknown error';
    errors.push(`pptx output is missing or invalid: ${pptxErrors}`);
  }

  if (summary.visual?.html?.required && !summary.visual.html.ok) {
    const detail = summary.visual.html.errors?.length
      ? summary.visual.html.errors.join('; ')
      : summary.visual.html.error || `status ${summary.visual.html.status ?? 'unknown'}`;
    errors.push(`html visual smoke failed: ${detail}`);
  }

  if (summary.visual?.pptx?.required && !summary.visual.pptx.ok) {
    const detail = summary.visual.pptx.errors?.length
      ? summary.visual.pptx.errors.join('; ')
      : summary.visual.pptx.error || `status ${summary.visual.pptx.status ?? 'unknown'}`;
    errors.push(`pptx visual smoke failed: ${detail}`);
  }

  return { ok: errors.length === 0, errors };
}
