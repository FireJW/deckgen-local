#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-workflow');
const defaultBriefPath = path.join(root, 'fixtures', 'frontend-design-boost', 'image-assisted-brief.md');

const usage = [
  'frontend-design-boost-image-workflow [--brief <path>] [--reference-intake <path>] [--out-dir <dir>] [--job <id>] [--apply]',
  '',
  'Run the local frontend-design-boost image workflow end to end without executing image generation by default.',
  'The workflow rebuilds the prompt pack, plans image jobs, and previews the selected job.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    briefPath: defaultBriefPath,
    referenceIntakePath: '',
    outDir: defaultOutDir,
    jobId: '',
    apply: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }
    if (flag === '--apply') {
      options.apply = true;
      continue;
    }

    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      fail(`Unexpected or missing value near ${flag ?? ''}.`);
    }

    if (flag === '--brief') {
      options.briefPath = value;
    } else if (flag === '--reference-intake') {
      options.referenceIntakePath = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
    } else if (flag === '--job') {
      options.jobId = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const relativePath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');
const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));
const runNodeScript = (scriptPath, args, env = process.env) =>
  execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    env
  });

const runNodeScriptCapture = (scriptPath, args, env = process.env) => {
  try {
    return {
      stdout: runNodeScript(scriptPath, args, env),
      stderr: '',
      exitCode: 0
    };
  } catch (error) {
    return {
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? ''),
      exitCode: error.status ?? 1
    };
  }
};

const options = parseArgs();
const resolvedOutDir = path.resolve(options.outDir);
const assistScript = path.join(root, 'scripts', 'frontend-design-boost-image-assist.mjs');
const planScript = path.join(root, 'scripts', 'frontend-design-boost-image-jobs-plan.mjs');
const runScript = path.join(root, 'scripts', 'frontend-design-boost-image-jobs-run.mjs');
const intakeScript = path.join(root, 'scripts', 'frontend-design-boost-asset-intake.mjs');
const decisionScript = path.join(root, 'scripts', 'frontend-design-boost-image-decision.mjs');

const assistArgs = ['--out-dir', resolvedOutDir, '--brief', options.briefPath];
if (options.referenceIntakePath) {
  assistArgs.push('--reference-intake', options.referenceIntakePath);
}
runNodeScript(assistScript, assistArgs);

const jobsPath = path.join(resolvedOutDir, 'image-generation-jobs.json');
const packPath = path.join(resolvedOutDir, 'image-prompts.json');
const planText = runNodeScript(planScript, ['--jobs', jobsPath]);
const plan = JSON.parse(planText);
const selectedJobId = options.jobId || plan.jobs?.[0]?.id || '';
const runArgs = ['--jobs', jobsPath];
if (selectedJobId) {
  runArgs.push('--job', selectedJobId);
}
if (options.apply) {
  runArgs.push('--apply');
}
const runResult = runNodeScriptCapture(runScript, runArgs, process.env);
const jobRun = JSON.parse(runResult.stdout);
const promptPack = readJson(packPath);
const intakeText = runNodeScript(intakeScript, [
  '--manifest',
  packPath,
  '--selection',
  path.join(resolvedOutDir, 'asset-selection.json'),
  '--out-dir',
  resolvedOutDir
]);
const assetIntake = JSON.parse(intakeText);
const decisionText = runNodeScript(decisionScript, [
  '--intake',
  path.join(resolvedOutDir, 'asset-intake-report.json'),
  '--out-dir',
  resolvedOutDir
]);
const assetDecision = JSON.parse(decisionText);

const report = {
  schema: 'frontend-design-boost-image-workflow/v1',
  ok: plan.ok === true && jobRun.ok === true && runResult.exitCode === 0,
  executed: jobRun.executed === true,
  applyRequired: jobRun.applyRequired ?? !options.apply,
  outDir: relativePath(resolvedOutDir),
  promptPack: {
    outDir: relativePath(resolvedOutDir),
    manifestPath: relativePath(packPath),
    assetSelectionPath: promptPack.assetSelectionPath,
    assetConsumptionDemoPath: promptPack.assetConsumptionDemoPath,
    generationJobsPath: promptPack.generationJobsPath,
    imagegenHandoffPath: promptPack.imagegenHandoffPath,
    defaultRoute: promptPack.defaultRoute,
    fallbackRoute: promptPack.fallbackRoute
  },
  jobPlan: plan,
  jobRun,
  assetIntake,
  assetDecision,
  runnerExitCode: runResult.exitCode,
  runnerStderr: runResult.stderr,
  selectedJobId,
  briefPath: relativePath(path.resolve(options.briefPath)),
  referenceIntakePath: options.referenceIntakePath ? relativePath(path.resolve(options.referenceIntakePath)) : '',
  apply: options.apply
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (runResult.exitCode !== 0) {
  process.exit(runResult.exitCode);
}
