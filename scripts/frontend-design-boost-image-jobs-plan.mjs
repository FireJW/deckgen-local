#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultJobsPath = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack', 'image-generation-jobs.json');

const usage = [
  'frontend-design-boost-image-jobs-plan [--jobs <path>]',
  '',
  'Read image-generation-jobs.json and report the approval-gated run plan.',
  'This command does not execute image generation commands.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { jobsPath: defaultJobsPath };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      fail(`Unexpected or missing value near ${flag ?? ''}.`);
    }

    if (flag === '--jobs') {
      options.jobsPath = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const relativePath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');

const readJobs = (jobsPath) => {
  if (!existsSync(jobsPath)) fail(`Missing image generation jobs manifest: ${relativePath(jobsPath)}`);
  try {
    return JSON.parse(readFileSync(jobsPath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${relativePath(jobsPath)}: ${error.message}`);
  }
};

const presentEnvValue = (name) => Boolean(process.env[name]);

const { jobsPath } = parseArgs();
const resolvedJobsPath = path.resolve(jobsPath);
const jobsManifest = readJobs(resolvedJobsPath);

if (jobsManifest.schema !== 'frontend-design-boost-image-generation-jobs/v1') {
  fail(`Unsupported image generation jobs schema: ${jobsManifest.schema ?? 'missing'}`);
}

if (!Array.isArray(jobsManifest.jobs) || jobsManifest.jobs.length === 0) {
  fail('Image generation jobs manifest contains no jobs.');
}

const environmentRequirements = Array.isArray(jobsManifest.environmentRequirements)
  ? jobsManifest.environmentRequirements
  : [];
const missingEnvironment = environmentRequirements
  .filter((name) => !presentEnvValue(name))
  .map((name) => ({
    type: 'missing environment variable',
    name
  }));

const malformedJobs = jobsManifest.jobs
  .filter((job) => !job.id || !job.prompt || !job.command || !job.dryRunCommand || !job.outputPath || !job.status)
  .map((job) => ({
    type: 'malformed job',
    id: job.id ?? '',
    label: job.label ?? ''
  }));

const blockedBy = [
  ...missingEnvironment,
  ...malformedJobs
];

const plan = {
  ok: malformedJobs.length === 0,
  executed: false,
  readyToRun: blockedBy.length === 0 && jobsManifest.executionMode === 'approval-gated',
  executionMode: jobsManifest.executionMode,
  model: jobsManifest.model,
  transport: jobsManifest.transport,
  jobsPath: relativePath(resolvedJobsPath),
  assetSelectionPath: jobsManifest.assetSelectionPath ?? '',
  commandArtifactPath: jobsManifest.commandArtifactPath ?? '',
  jobCount: jobsManifest.jobs.length,
  environmentRequirements,
  blockedBy,
  dryRunCommands: jobsManifest.jobs.map((job) => job.dryRunCommand),
  executableCommands: jobsManifest.jobs.map((job) => job.command),
  jobs: jobsManifest.jobs.map((job) => ({
    id: job.id,
    label: job.label,
    status: job.status,
    outputPath: job.outputPath,
    approvalGate: job.approvalGate ?? ''
  }))
};

process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
