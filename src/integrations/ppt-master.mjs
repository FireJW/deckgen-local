import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  getPptMasterExporterPath,
  resolvePptMasterPythonPath,
  shouldUseShellForCommand
} from '../renderers/ppt-master/render.mjs';

const missingCheckoutNextStep = 'Provide a local ppt-master checkout, then rerun this preflight before PPTX export.';
const missingExporterNextStep = 'Use a ppt-master checkout that contains skills/ppt-master/scripts/svg_to_pptx.py.';
const pythonUnavailableNextStep = 'Repair or recreate the ppt-master Python environment, then rerun this preflight.';
const missingPythonPptxNextStep = 'Install python-pptx into the resolved ppt-master Python environment, then rerun this preflight.';

const trimOutput = (value) => String(value ?? '').trim().slice(0, 2000);

const runPythonProcess = (pythonPath, args) => {
  const run = spawnSync(pythonPath, args, {
    encoding: 'utf8',
    shell: shouldUseShellForCommand(pythonPath)
  });
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    errorMessage: run.error?.message
  };
};

const failed = (base, error, nextStep) => ({
  ...base,
  ok: false,
  error,
  next_step: nextStep
});

export function inspectPptMasterEnvironment({
  pptMasterPath,
  pythonPath,
  env = process.env,
  runPython = runPythonProcess
} = {}) {
  const resolvedPath = path.resolve(pptMasterPath ?? '');
  const base = {
    ok: false,
    pptMasterPath: resolvedPath,
    checkoutFound: false,
    exporterFound: false,
    pythonExecutable: '',
    pythonFound: false,
    pythonVersion: '',
    pythonPptxImportOk: false
  };

  if (!existsSync(resolvedPath)) {
    return failed(base, `ppt-master checkout not found: ${resolvedPath}`, missingCheckoutNextStep);
  }

  if (!statSync(resolvedPath).isDirectory()) {
    return failed(base, `ppt-master path is not a directory: ${resolvedPath}`, missingCheckoutNextStep);
  }

  base.checkoutFound = true;
  const exporterPath = getPptMasterExporterPath(resolvedPath);
  base.exporterPath = exporterPath;
  if (!existsSync(exporterPath) || !statSync(exporterPath).isFile()) {
    return failed(base, `ppt-master exporter not found: ${exporterPath}`, missingExporterNextStep);
  }
  base.exporterFound = true;

  const pythonExecutable = resolvePptMasterPythonPath({
    pptMasterPath: resolvedPath,
    pythonPath,
    env
  });
  base.pythonExecutable = pythonExecutable;

  const versionRun = runPython(pythonExecutable, ['--version']);
  if (versionRun.errorMessage || versionRun.status !== 0) {
    const detail = trimOutput(versionRun.stderr || versionRun.stdout || versionRun.errorMessage);
    return failed({
      ...base,
      pythonVersionStatus: versionRun.status
    }, `ppt-master Python could not start${detail ? `: ${detail}` : ''}`, pythonUnavailableNextStep);
  }

  base.pythonFound = true;
  base.pythonVersion = trimOutput(versionRun.stdout || versionRun.stderr);

  const importRun = runPython(pythonExecutable, [
    '-c',
    'from pptx import Presentation; print("python-pptx import ok")'
  ]);
  if (importRun.errorMessage || importRun.status !== 0) {
    const detail = trimOutput(importRun.stderr || importRun.stdout || importRun.errorMessage);
    return failed({
      ...base,
      pythonPptxImportStatus: importRun.status
    }, `python-pptx import failed${detail ? `: ${detail}` : ''}`, missingPythonPptxNextStep);
  }

  return {
    ...base,
    ok: true,
    pythonPptxImportOk: true,
    pythonPptxImportOutput: trimOutput(importRun.stdout || importRun.stderr),
    next_step: 'PPTX export preflight passed. Run deckgen generate with --output pptx or --output both.'
  };
}

export function buildPptMasterPreflightResult(pptMasterPath, options = {}) {
  const inspection = inspectPptMasterEnvironment({
    pptMasterPath,
    pythonPath: options.pythonPath,
    env: options.env
  });
  return {
    ...inspection,
    integration: inspection.ok ? 'ppt-master-ready' : 'blocked-ppt-master-not-ready'
  };
}
