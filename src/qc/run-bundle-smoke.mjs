import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { validateDeckContract } from '../contract/validate.mjs';
import { findHtmlArtifactForRunDir } from './html-visual-smoke.mjs';
import {
  findLatestPptxArtifactForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from './pptx-structural-smoke.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

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

const inspectPptxOutput = (runDir, required, expectedSlides) => {
  if (!required) {
    return { required, ok: true };
  }

  try {
    const pptxPath = findLatestPptxArtifactForRunDir(runDir);
    const pptx = inspectPptxFile(pptxPath);
    const validation = validatePptxSmokeResult(pptx, { expectedSlides });
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

export function inspectDeckRunBundle({ runDir } = {}) {
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
    pptx: inspectPptxOutput(resolvedRunDir, expectedOutputs.includes('pptx'), expectedSlides)
  };
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

    if (Array.isArray(summary.runResult.data.outputs) && Array.isArray(summary.expectedOutputs)) {
      const resultOutputs = [...summary.runResult.data.outputs].sort();
      const contractOutputs = [...summary.expectedOutputs].sort();
      if (JSON.stringify(resultOutputs) !== JSON.stringify(contractOutputs)) {
        errors.push(`run_result.json outputs ${resultOutputs.join(',')} do not match deck_contract.json outputs ${contractOutputs.join(',')}`);
      }
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
      } else if (!summary.runResult.data.pptxPaths.every((pptxPath) => path.resolve(pptxPath).startsWith(path.resolve(expectedPptxDir)))) {
        errors.push(`run_result.json pptxPaths must point inside ${expectedPptxDir}`);
      }
    }
  }

  if (!summary.sourceManifest?.ok || !summary.sourceManifest?.validation?.ok) {
    errors.push(`source_manifest.json is missing or invalid: ${(summary.sourceManifest?.validation?.errors ?? [summary.sourceManifest?.error ?? 'unknown error']).join('; ')}`);
  } else if (!isObject(summary.sourceManifest.data.primary) || typeof summary.sourceManifest.data.primary.path !== 'string' || summary.sourceManifest.data.primary.path.trim() === '') {
    errors.push('source_manifest.json primary.path must be a non-empty string');
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

  return { ok: errors.length === 0, errors };
}
