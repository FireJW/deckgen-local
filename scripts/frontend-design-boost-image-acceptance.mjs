#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-acceptance');
const defaultBriefPath = path.join(root, 'fixtures', 'frontend-design-boost', 'image-assisted-brief.md');

const usage = [
  'frontend-design-boost-image-acceptance [--brief <path>] [--reference-intake <path>] [--out-dir <dir>] [--installed-skill <path>] [--job <id>]',
  '',
  'Run a local acceptance pass for the image-assisted frontend-design workflow.',
  'This command does not execute live image generation and does not write the installed skill.'
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
    installedSkillPath: '',
    jobId: ''
  };

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

    if (flag === '--brief') {
      options.briefPath = value;
    } else if (flag === '--reference-intake') {
      options.referenceIntakePath = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
    } else if (flag === '--installed-skill') {
      options.installedSkillPath = value;
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
const runJsonScript = (scriptPath, args, env = process.env) => {
  const stdout = execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
    env
  });
  return parseJsonOutput(stdout);
};

const parseJsonOutput = (stdout) => {
  const text = String(stdout).trim();
  try {
    return JSON.parse(text);
  } catch {
    for (let index = text.lastIndexOf('{'); index >= 0; index = text.lastIndexOf('{', index - 1)) {
      try {
        return JSON.parse(text.slice(index));
      } catch {
        // Continue scanning for the start of the final JSON object.
      }
    }
  }
  throw new Error('Unable to parse JSON output from child script.');
};

const options = parseArgs();
const resolvedOutDir = path.resolve(options.outDir);
const workflowScript = path.join(root, 'scripts', 'frontend-design-boost-image-workflow.mjs');
const qaScript = path.join(root, 'scripts', 'frontend-design-boost-image-pack-qa.mjs');
const readinessScript = path.join(root, 'scripts', 'frontend-design-boost-skill-readiness.mjs');

const commonArgs = [
  '--brief',
  options.briefPath,
  '--out-dir',
  resolvedOutDir
];
if (options.referenceIntakePath) {
  commonArgs.push('--reference-intake', options.referenceIntakePath);
}

const workflowArgs = [...commonArgs];
if (options.jobId) {
  workflowArgs.push('--job', options.jobId);
}

const workflow = runJsonScript(workflowScript, workflowArgs);
const promptPackQa = runJsonScript(qaScript, commonArgs);
const readinessArgs = [];
if (options.installedSkillPath) {
  readinessArgs.push('--installed-skill', options.installedSkillPath);
}
const installedSkill = runJsonScript(readinessScript, readinessArgs);
const blockers = [];
const cliFallbackBlockers = (workflow.jobPlan?.blockedBy ?? []).map((blocker) => ({
  source: 'image job plan',
  ...blocker
}));

if (!installedSkill.ready) {
  blockers.push({
    source: 'installed skill',
    type: 'installed skill is stale',
    blockerSummary: installedSkill.blockerSummary ?? [],
    missingMarkers: installedSkill.missingMarkers ?? []
  });
}

const readyForBuiltInImagegenHandoff = blockers.length === 0
  && promptPackQa.ok === true
  && workflow.promptPack?.defaultRoute?.transport === 'built-in-imagegen'
  && workflow.promptPack?.defaultRoute?.requiresOpenAiApiKey === false
  && installedSkill.ready === true;
const readyForCliLiveGeneration = readyForBuiltInImagegenHandoff
  && cliFallbackBlockers.length === 0
  && workflow.jobRun?.ok === true;
const readyForLiveGeneration = readyForBuiltInImagegenHandoff || readyForCliLiveGeneration;

const report = {
  schema: 'frontend-design-boost-image-acceptance/v1',
  ok: true,
  executed: false,
  readyForLiveGeneration,
  outDir: relativePath(resolvedOutDir),
  sourceBrief: relativePath(path.resolve(options.briefPath)),
  sourceReferenceIntake: options.referenceIntakePath ? relativePath(path.resolve(options.referenceIntakePath)) : '',
  workflow,
  promptPackQa,
  installedSkill,
  blockers,
  cliFallbackBlockers,
  readyForBuiltInImagegenHandoff,
  readyForCliLiveGeneration,
  nextSteps: readyForLiveGeneration
    ? [
      'Get explicit approval before running live gpt-image-2 generation.',
      readyForBuiltInImagegenHandoff
        ? 'Use imagegen-handoff.json with the installed imagegen skill, then move accepted outputs into project-local asset paths.'
        : 'Run the selected image job with --apply.',
      'Run asset smoke, asset intake, and screenshot QA after generation.'
    ]
    : [
      'Resolve blockers before live gpt-image-2 generation.',
      'Sync the installed skill only after explicit approval.',
      'Use the built-in imagegen handoff as the default route, or provide OPENAI_API_KEY for the optional CLI fallback before --apply.',
      'Use the workflow and asset intake reports as implementation handoff evidence.'
    ]
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
