#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultJobsPath = path.join(defaultPackDir, 'image-generation-jobs.json');
const defaultRunnerReportPath = path.join(defaultPackDir, 'runner-report.json');

const usage = [
  'frontend-design-boost-ccswitch-acceptance [--jobs <path>] [--job <id>] [--asset-id <id>] [--asset <png>] [--runner-report <path>] [--selection <path>] [--manifest <path>] [--installed-skill <path>] [--codex-home <path>] [--out-dir <dir>]',
  '',
  'Validate the approved ccswitch post-generation path: asset smoke, image evidence, asset intake, image decision, implementation handoff, and read-only goal audit.',
  'This command does not call image generation APIs.'
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
    assetId: '',
    assetPath: '',
    runnerReportPath: defaultRunnerReportPath,
    selectionPath: '',
    manifestPath: '',
    installedSkillPath: '',
    codexHome: '',
    outDir: '',
    outDirSupplied: false
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

    if (flag === '--jobs') {
      options.jobsPath = value;
    } else if (flag === '--job') {
      options.jobId = value;
    } else if (flag === '--asset-id') {
      options.assetId = value;
    } else if (flag === '--asset') {
      options.assetPath = value;
    } else if (flag === '--runner-report') {
      options.runnerReportPath = value;
    } else if (flag === '--selection') {
      options.selectionPath = value;
    } else if (flag === '--manifest') {
      options.manifestPath = value;
    } else if (flag === '--installed-skill') {
      options.installedSkillPath = value;
    } else if (flag === '--codex-home') {
      options.codexHome = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
      options.outDirSupplied = true;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const toProjectPath = (filePath) => {
  const absolutePath = path.resolve(filePath);
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  return relative.startsWith('..') || path.isAbsolute(relative)
    ? absolutePath.split(path.sep).join('/')
    : relative;
};

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) fail(`Missing ${label}: ${toProjectPath(filePath)}`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${label}: ${error.message}`);
  }
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
        // Continue scanning for the final JSON object.
      }
    }
  }
  throw new Error('Unable to parse JSON output from child script.');
};

const runJsonScript = (scriptPath, args) => parseJsonOutput(execFileSync(process.execPath, [scriptPath, ...args], {
  cwd: root,
  encoding: 'utf8'
}));

const renderMarkdown = (report) => [
  '# Frontend Design Boost CC Switch Acceptance',
  '',
  `Jobs: \`${report.jobsPath}\``,
  `Runner report: \`${report.runnerReportPath}\``,
  `Asset: \`${report.assetId}\``,
  `Route: \`${report.route}\``,
  '',
  '## Gate Results',
  '',
  `- Asset smoke: ${report.assetSmoke.ok ? 'pass' : 'fail'}`,
  `- Image evidence: ${report.imageEvidence.liveGenerationEvidence ? 'pass' : 'fail'}`,
  `- Asset intake: ${report.assetIntake.ok ? 'pass' : 'fail'}`,
  `- Image decision: ${report.assetDecision.ok ? 'pass' : 'fail'}`,
  `- Implementation handoff: ${report.implementationHandoff.readyForImplementation ? 'pass' : 'blocked'}`,
  `- Goal audit: ${report.goalAudit.goalComplete ? 'complete' : 'blocked'}`,
  '',
  '## Artifacts',
  '',
  `- Asset smoke report: \`${report.assetSmokePath}\``,
  `- Image evidence: \`${report.evidencePath}\``,
  `- Image decision: \`${report.assetDecision.reportPath}\``,
  `- Implementation handoff: \`${report.implementationHandoffPath}\``,
  `- Goal audit: \`${report.goalAuditPath}\``,
  '',
  '## Next Gates',
  '',
  ...report.nextGates.map((gate) => `- ${gate}`),
  ''
].join('\n');

const options = parseArgs();
const jobsPath = path.resolve(options.jobsPath);
const jobsDir = path.dirname(jobsPath);
const outDir = path.resolve(options.outDirSupplied ? options.outDir : jobsDir);
const runnerReportPath = path.resolve(options.runnerReportPath);
const selectionPath = path.resolve(options.selectionPath || path.join(jobsDir, 'asset-selection.json'));
const manifestPath = path.resolve(options.manifestPath || path.join(jobsDir, 'image-prompts.json'));

mkdirSync(outDir, { recursive: true });

const jobs = readJson(jobsPath, 'image generation jobs manifest');
if (jobs.schema !== 'frontend-design-boost-image-generation-jobs/v1') {
  fail(`Unsupported image generation jobs schema: ${jobs.schema ?? 'missing'}`);
}
if (jobs.transport !== 'ccswitch') {
  fail(`CC Switch acceptance requires jobs transport ccswitch, received: ${jobs.transport ?? 'missing'}`);
}
const runnerReport = readJson(runnerReportPath, 'ccswitch runner report');
if (runnerReport.schema !== 'frontend-design-boost-image-job-run/v1') {
  fail(`Unsupported runner report schema: ${runnerReport.schema ?? 'missing'}`);
}
if (runnerReport.transport !== 'ccswitch') {
  fail(`CC Switch acceptance requires runner report transport ccswitch, received: ${runnerReport.transport ?? 'missing'}`);
}
if (runnerReport.executed !== true) {
  fail('CC Switch acceptance requires a runner report with executed: true.');
}

const assetId = options.assetId || options.jobId || runnerReport.selectedJob?.id || jobs.jobs?.[0]?.id || '';
if (!assetId) fail('Unable to infer asset id; pass --job or --asset-id.');
const selectedJob = Array.isArray(jobs.jobs)
  ? jobs.jobs.find((job) => job.id === assetId)
  : null;
if (!selectedJob) fail(`No image generation job found for id: ${assetId}`);

const assetPath = path.resolve(options.assetPath || path.join(root, selectedJob.outputPath ?? ''));
const evidenceScript = path.join(root, 'scripts', 'frontend-design-boost-image-evidence.mjs');
const smokeScript = path.join(root, 'scripts', 'frontend-design-boost-asset-smoke.mjs');
const intakeScript = path.join(root, 'scripts', 'frontend-design-boost-asset-intake.mjs');
const decisionScript = path.join(root, 'scripts', 'frontend-design-boost-image-decision.mjs');
const implementationHandoffScript = path.join(root, 'scripts', 'frontend-design-boost-image-implementation-handoff.mjs');
const goalAuditScript = path.join(root, 'scripts', 'frontend-design-boost-goal-audit.mjs');

const imageEvidence = runJsonScript(evidenceScript, [
  '--jobs',
  jobsPath,
  '--job',
  assetId,
  '--asset',
  assetPath,
  '--runner-report',
  runnerReportPath,
  '--out-dir',
  outDir
]);

const assetSmoke = runJsonScript(smokeScript, [
  '--selection',
  selectionPath,
  '--asset-id',
  assetId
]);
const assetSmokePath = path.join(outDir, 'asset-smoke-report.json');
writeFileSync(assetSmokePath, `${JSON.stringify(assetSmoke, null, 2)}\n`, 'utf8');

const assetIntake = runJsonScript(intakeScript, [
  '--manifest',
  manifestPath,
  '--selection',
  selectionPath,
  '--out-dir',
  outDir
]);

const assetDecision = runJsonScript(decisionScript, [
  '--intake',
  path.resolve(root, assetIntake.reportPath),
  '--out-dir',
  outDir
]);

const implementationHandoff = runJsonScript(implementationHandoffScript, [
  '--decision',
  path.resolve(root, assetDecision.reportPath),
  '--evidence',
  path.resolve(root, imageEvidence.reportPath),
  '--asset-id',
  assetId,
  '--out-dir',
  outDir
]);

const goalAuditArgs = [
  '--jobs',
  jobsPath,
  '--live-evidence',
  path.resolve(root, imageEvidence.reportPath),
  '--implementation-handoff',
  path.resolve(root, implementationHandoff.reportPath)
];
if (options.installedSkillPath) goalAuditArgs.push('--installed-skill', options.installedSkillPath);
if (options.codexHome) goalAuditArgs.push('--codex-home', options.codexHome);
const goalAudit = runJsonScript(goalAuditScript, goalAuditArgs);
const goalAuditPath = path.join(outDir, 'goal-audit-report.json');
writeFileSync(goalAuditPath, `${JSON.stringify(goalAudit, null, 2)}\n`, 'utf8');

const blockedBy = [
  ...(assetSmoke.ok ? [] : [{ gate: 'asset-smoke', errors: assetSmoke.errors ?? [] }]),
  ...(imageEvidence.liveGenerationEvidence ? [] : [{ gate: 'image-evidence', errors: imageEvidence.blockedBy ?? [] }]),
  ...(assetIntake.ok ? [] : [{ gate: 'asset-intake', errors: assetIntake.blockedBy ?? [] }]),
  ...(assetDecision.ok ? [] : [{ gate: 'image-decision', errors: assetDecision.blockedBy ?? [] }]),
  ...(implementationHandoff.readyForImplementation ? [] : [{ gate: 'implementation-handoff', errors: implementationHandoff.blockers ?? [] }])
];

const reportPath = path.join(outDir, 'ccswitch-acceptance-report.json');
const markdownPath = path.join(outDir, 'ccswitch-acceptance.md');
const report = {
  schema: 'frontend-design-boost-ccswitch-acceptance/v1',
  ok: blockedBy.length === 0,
  executed: false,
  route: 'ccswitch',
  model: jobs.model ?? '',
  assetId,
  jobsPath: toProjectPath(jobsPath),
  runnerReportPath: toProjectPath(runnerReportPath),
  assetPath: toProjectPath(assetPath),
  selectionPath: toProjectPath(selectionPath),
  manifestPath: toProjectPath(manifestPath),
  assetSmoke,
  assetSmokePath: toProjectPath(assetSmokePath),
  imageEvidence,
  evidencePath: imageEvidence.reportPath,
  assetIntake,
  assetDecision,
  implementationHandoff,
  implementationHandoffPath: implementationHandoff.reportPath,
  goalAudit,
  goalAuditPath: toProjectPath(goalAuditPath),
  reportPath: toProjectPath(reportPath),
  markdownPath: toProjectPath(markdownPath),
  blockedBy,
  nextGates: [
    'Review the generated image implementation handoff before coding from the accepted ccswitch asset.',
    'Use the selected image as visual direction only; rebuild controls, copy, data, states, semantics, and accessibility in code.',
    'Run desktop and mobile screenshot QA before final frontend handoff.'
  ],
  generatedAt: new Date().toISOString()
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.ok ? 0 : 1);
