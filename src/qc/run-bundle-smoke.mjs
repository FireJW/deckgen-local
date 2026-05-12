import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { validateDeckContract } from '../contract/validate.mjs';
import { findHtmlArtifactForRunDir } from './html-visual-smoke.mjs';
import {
  findLatestPptxArtifactForRunDir,
  inspectPptxFile,
  validatePptxSmokeResult
} from './pptx-structural-smoke.mjs';

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
