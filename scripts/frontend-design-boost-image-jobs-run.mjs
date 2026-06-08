#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultJobsPath = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack', 'image-generation-jobs.json');

const usage = [
  'frontend-design-boost-image-jobs-run [--jobs <path>] [--job <id>] [--report <path>] [--dry-run] [--apply]',
  '',
  'Select an image-generation job and either preview or execute its structured command.',
  'Default mode is preview only. Use --apply explicitly to run a command.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    jobsPath: defaultJobsPath,
    jobId: '',
    reportPath: '',
    dryRun: true,
    apply: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }
    if (flag === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (flag === '--real') {
      options.dryRun = false;
      continue;
    }
    if (flag === '--apply') {
      options.apply = true;
      options.dryRun = false;
      continue;
    }

    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      fail(`Unexpected or missing value near ${flag ?? ''}.`);
    }

    if (flag === '--jobs') {
      options.jobsPath = value;
    } else if (flag === '--job') {
      options.jobId = value;
    } else if (flag === '--report') {
      options.reportPath = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const relativePath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');
const isRepoLocal = (filePath) => {
  const relative = path.relative(root, path.resolve(filePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const writeReportFile = (report, reportPath) => {
  if (!reportPath) return report;

  const resolvedReportPath = path.resolve(reportPath);
  if (!isRepoLocal(resolvedReportPath)) {
    fail(`Report path must stay inside this repo: ${resolvedReportPath}`);
  }

  const reportWithPath = {
    ...report,
    reportPath: relativePath(resolvedReportPath)
  };
  mkdirSync(path.dirname(resolvedReportPath), { recursive: true });
  writeFileSync(resolvedReportPath, `${JSON.stringify(reportWithPath, null, 2)}\n`, 'utf8');
  return reportWithPath;
};

const readJobs = (jobsPath) => {
  if (!existsSync(jobsPath)) fail(`Missing image generation jobs manifest: ${relativePath(jobsPath)}`);
  try {
    return JSON.parse(readFileSync(jobsPath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${relativePath(jobsPath)}: ${error.message}`);
  }
};

const quoteCommandPart = (part) => {
  const value = String(part);
  if (value.startsWith('$CODEX_HOME/')) return `"${value.replace(/"/g, '""')}"`;
  if (/^[A-Za-z0-9_./:$-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const commandFromParts = (parts) => parts.map(quoteCommandPart).join(' ');

const codexHome = () =>
  process.env.CODEX_HOME || path.join(os.homedir(), process.platform === 'win32' ? '.codex' : '.codex');

const resolveCommandParts = (parts) => parts.map((part) => {
  if (typeof part !== 'string') return String(part);
  if (part === '$CODEX_HOME') return codexHome();
  if (part.startsWith('$CODEX_HOME/')) return path.join(codexHome(), ...part.slice('$CODEX_HOME/'.length).split('/'));
  return part;
});

const validateStructuredCommand = (job, parts) => {
  const errors = [];
  if (!Array.isArray(parts) || parts.length === 0) {
    errors.push({ type: 'missing structured command parts', job: job.id });
    return errors;
  }
  if (parts[0] !== 'py') errors.push({ type: 'unexpected executable', executable: parts[0] });
  if (!parts.includes('generate')) errors.push({ type: 'missing image generation subcommand' });
  if (!parts.includes('--model') || !parts.includes('gpt-image-2')) {
    errors.push({ type: 'missing gpt-image-2 model argument' });
  }
  if (!parts.some((part) => String(part).includes('image_gen.py'))) {
    errors.push({ type: 'missing imagegen script path' });
  }
  return errors;
};

const options = parseArgs();
const resolvedJobsPath = path.resolve(options.jobsPath);
const jobsManifest = readJobs(resolvedJobsPath);

if (jobsManifest.schema !== 'frontend-design-boost-image-generation-jobs/v1') {
  fail(`Unsupported image generation jobs schema: ${jobsManifest.schema ?? 'missing'}`);
}
if (!Array.isArray(jobsManifest.jobs) || jobsManifest.jobs.length === 0) {
  fail('Image generation jobs manifest contains no jobs.');
}

const selectedJob = options.jobId
  ? jobsManifest.jobs.find((job) => job.id === options.jobId)
  : jobsManifest.jobs[0];
if (!selectedJob) fail(`No image generation job found for id: ${options.jobId}`);

const dryRunCommandParts = selectedJob.dryRunCommandParts ?? [];
const commandParts = selectedJob.commandParts ?? [];
const selectedParts = options.dryRun ? dryRunCommandParts : commandParts;
const commandValidationErrors = validateStructuredCommand(selectedJob, selectedParts);
const environmentRequirements = Array.isArray(jobsManifest.environmentRequirements)
  ? jobsManifest.environmentRequirements
  : [];
const missingEnvironment = options.dryRun
  ? []
  : environmentRequirements
    .filter((name) => !process.env[name])
    .map((name) => ({ type: 'missing environment variable', name }));
const blockedBy = [
  ...commandValidationErrors,
  ...missingEnvironment
];
const resolvedParts = resolveCommandParts(selectedParts);
const nextCommand = selectedParts.length > 0
  ? selectedJob[options.dryRun ? 'dryRunCommand' : 'command'] ?? commandFromParts(selectedParts)
  : '';
const report = {
  schema: 'frontend-design-boost-image-job-run/v1',
  ok: blockedBy.length === 0,
  executed: false,
  applyRequested: options.apply,
  applyRequired: !options.apply,
  mode: options.dryRun ? 'dry-run' : 'real-generation',
  jobsPath: relativePath(resolvedJobsPath),
  model: jobsManifest.model,
  transport: jobsManifest.transport,
  environmentRequirements,
  blockedBy,
  selectedJob: {
    id: selectedJob.id,
    label: selectedJob.label,
    outputPath: selectedJob.outputPath,
    approvalGate: selectedJob.approvalGate ?? ''
  },
  nextCommand,
  commandParts,
  dryRunCommandParts,
  reportPath: options.reportPath ? relativePath(path.resolve(options.reportPath)) : ''
};

if (!options.apply) {
  const outputReport = writeReportFile(report, options.reportPath);
  process.stdout.write(`${JSON.stringify(outputReport, null, 2)}\n`);
  process.exit(0);
}

if (blockedBy.length > 0) {
  const outputReport = writeReportFile(report, options.reportPath);
  process.stdout.write(`${JSON.stringify(outputReport, null, 2)}\n`);
  process.exit(1);
}

const [executable, ...args] = resolvedParts;
const child = spawnSync(executable, args, {
  cwd: root,
  env: process.env,
  encoding: 'utf8'
});

const executedReport = {
  ...report,
  executed: true,
  applyRequired: false,
  resolvedCommand: commandFromParts(resolvedParts),
  exitCode: child.status ?? 1,
  signal: child.signal ?? '',
  stdout: child.stdout ?? '',
  stderr: child.stderr ?? ''
};

const outputReport = writeReportFile(executedReport, options.reportPath);
process.stdout.write(`${JSON.stringify(outputReport, null, 2)}\n`);
process.exit(child.status ?? 1);
