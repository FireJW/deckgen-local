#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { inspectPngFile } from '../src/qc/pptx-visual-smoke.mjs';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultJobsPath = path.join(defaultPackDir, 'image-generation-jobs.json');
const defaultOutDir = defaultPackDir;

const usage = [
  'frontend-design-boost-image-evidence [--jobs <path>] [--job <id>] [--asset <path>] [--runner-report <path>] [--handoff <path>] [--asset-id <id>] [--out-dir <dir>]',
  '',
  'Record local evidence for a completed gpt-image-2 frontend-design-boost image job or built-in imagegen handoff asset.',
  'This command validates local files only; it does not call image generation APIs.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    jobsPath: defaultJobsPath,
    handoffPath: '',
    jobId: '',
    assetId: '',
    assetPath: '',
    runnerReportPath: '',
    outDir: defaultOutDir
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
    } else if (flag === '--handoff') {
      options.handoffPath = value;
    } else if (flag === '--job') {
      options.jobId = value;
    } else if (flag === '--asset-id') {
      options.assetId = value;
    } else if (flag === '--asset') {
      options.assetPath = value;
    } else if (flag === '--runner-report') {
      options.runnerReportPath = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
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
  return relative.startsWith('..') || path.isAbsolute(relative) ? absolutePath.split(path.sep).join('/') : relative;
};

const isRepoLocal = (filePath) => {
  const relative = path.relative(root, path.resolve(filePath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) fail(`Missing ${label}: ${toProjectPath(filePath)}`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${label} ${toProjectPath(filePath)}: ${error.message}`);
  }
};

const parseSize = (size) => {
  const match = String(size ?? '').match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
};

const readRunnerReport = (runnerReportPath) => {
  if (!runnerReportPath) {
    return {
      supplied: false,
      valid: false,
      executed: false,
      path: '',
      errors: ['missing runner report for live generation evidence']
    };
  }

  const resolvedRunnerPath = path.resolve(runnerReportPath);
  if (!existsSync(resolvedRunnerPath)) {
    return {
      supplied: true,
      valid: false,
      executed: false,
      path: toProjectPath(resolvedRunnerPath),
      errors: ['runner report file is missing']
    };
  }

  let report;
  try {
    report = JSON.parse(readFileSync(resolvedRunnerPath, 'utf8'));
  } catch (error) {
    return {
      supplied: true,
      valid: false,
      executed: false,
      path: toProjectPath(resolvedRunnerPath),
      errors: [`runner report is invalid JSON: ${error.message}`]
    };
  }

  return {
    supplied: true,
    valid: true,
    executed: report.executed === true,
    path: toProjectPath(resolvedRunnerPath),
    schema: report.schema ?? '',
    ok: report.ok ?? null,
    model: report.model ?? '',
    transport: report.transport ?? '',
    selectedJob: report.selectedJob ?? null,
    exitCode: report.exitCode ?? null,
    raw: report,
    errors: []
  };
};

const validateRunnerReport = ({ runnerReport, selectedJob, jobsManifest }) => {
  const errors = [...(runnerReport.errors ?? [])];
  if (!runnerReport.supplied || !runnerReport.valid) return errors;

  if (runnerReport.schema !== 'frontend-design-boost-image-job-run/v1') {
    errors.push(`unsupported runner report schema: ${runnerReport.schema || 'missing'}`);
  }
  if (!runnerReport.executed) errors.push('runner report did not execute a live generation command');
  if (runnerReport.model !== 'gpt-image-2') errors.push(`runner report model is ${runnerReport.model || 'missing'}, expected gpt-image-2`);
  if (runnerReport.transport !== 'ccswitch') errors.push(`runner report transport is ${runnerReport.transport || 'missing'}, expected ccswitch`);
  if (runnerReport.selectedJob?.id !== selectedJob.id) {
    errors.push(`runner report job ${runnerReport.selectedJob?.id || 'missing'} does not match selected job ${selectedJob.id}`);
  }
  if (runnerReport.selectedJob?.outputPath && runnerReport.selectedJob.outputPath !== selectedJob.outputPath) {
    errors.push('runner report output path does not match the selected job output path');
  }
  if (runnerReport.exitCode !== null && runnerReport.exitCode !== 0) {
    errors.push(`runner report exit code is ${runnerReport.exitCode}`);
  }
  if (jobsManifest.model !== 'gpt-image-2') errors.push(`jobs manifest model is ${jobsManifest.model || 'missing'}`);
  if (jobsManifest.transport !== 'ccswitch') errors.push(`jobs manifest transport is ${jobsManifest.transport || 'missing'}`);

  return errors;
};

const readBuiltInHandoff = (handoffPath) => {
  if (!handoffPath) {
    return {
      supplied: false,
      valid: false,
      path: '',
      errors: []
    };
  }

  const resolvedHandoffPath = path.resolve(handoffPath);
  if (!existsSync(resolvedHandoffPath)) {
    return {
      supplied: true,
      valid: false,
      path: toProjectPath(resolvedHandoffPath),
      errors: ['built-in imagegen handoff file is missing']
    };
  }

  let handoff;
  try {
    handoff = JSON.parse(readFileSync(resolvedHandoffPath, 'utf8'));
  } catch (error) {
    return {
      supplied: true,
      valid: false,
      path: toProjectPath(resolvedHandoffPath),
      errors: [`built-in imagegen handoff is invalid JSON: ${error.message}`]
    };
  }

  return {
    supplied: true,
    valid: true,
    path: toProjectPath(resolvedHandoffPath),
    schema: handoff.schema ?? '',
    model: handoff.model ?? '',
    executionMode: handoff.executionMode ?? '',
    requiresOpenAiApiKey: handoff.requiresOpenAiApiKey ?? null,
    sourceDefaultDirectory: handoff.sourceDefaultDirectory ?? '',
    assets: Array.isArray(handoff.assets) ? handoff.assets : [],
    raw: handoff,
    errors: []
  };
};

const validateBuiltInHandoff = ({ handoff, selectedJob }) => {
  const errors = [...(handoff.errors ?? [])];
  if (!handoff.supplied || !handoff.valid) return errors;

  if (handoff.schema !== 'frontend-design-boost-imagegen-handoff/v1') {
    errors.push(`unsupported built-in imagegen handoff schema: ${handoff.schema || 'missing'}`);
  }
  if (handoff.executionMode !== 'codex-built-in-imagegen-handoff') {
    errors.push(`unexpected built-in imagegen handoff execution mode: ${handoff.executionMode || 'missing'}`);
  }
  if (handoff.requiresOpenAiApiKey !== false) {
    errors.push('built-in imagegen handoff unexpectedly requires OPENAI_API_KEY');
  }
  if (handoff.model !== 'gpt-image-2') {
    errors.push(`built-in imagegen handoff model is ${handoff.model || 'missing'}, expected gpt-image-2`);
  }
  if (handoff.sourceDefaultDirectory !== 'CODEX_HOME/generated_images') {
    errors.push('built-in imagegen handoff does not record CODEX_HOME/generated_images as the source directory');
  }
  if (!handoff.assets.some((asset) => asset.id === selectedJob.id)) {
    errors.push(`built-in imagegen handoff does not include asset ${selectedJob.id}`);
  }

  return errors;
};

const validateAsset = ({ assetPath, selectedJob }) => {
  const resolvedAssetPath = path.resolve(assetPath || path.join(root, selectedJob.outputPath));
  const errors = [];
  const expected = parseSize(selectedJob.size);
  const asset = {
    path: toProjectPath(resolvedAssetPath),
    expectedSize: selectedJob.size ?? '',
    repoLocal: isRepoLocal(resolvedAssetPath),
    exists: existsSync(resolvedAssetPath),
    dimensions: null,
    dimensionsMatch: false,
    bytes: 0,
    mime: ''
  };

  if (!asset.repoLocal) errors.push('asset path is not local to this repo');
  if (!asset.exists) {
    errors.push(`missing generated asset: ${asset.path}`);
    return { asset, errors };
  }

  asset.bytes = statSync(resolvedAssetPath).size;
  if (asset.bytes < 1) errors.push(`empty generated asset: ${asset.path}`);

  try {
    const inspection = inspectPngFile(resolvedAssetPath);
    asset.mime = inspection.screenshotMime;
    asset.dimensions = {
      width: inspection.imageWidth,
      height: inspection.imageHeight
    };
    asset.pixelUniqueColorCount = inspection.pixelUniqueColorCount;
    asset.pixelBlankRatio = inspection.pixelBlankRatio;
    asset.dimensionsMatch = expected
      ? inspection.imageWidth === expected.width && inspection.imageHeight === expected.height
      : false;
    if (!asset.dimensionsMatch) {
      errors.push(`asset dimensions ${inspection.imageWidth}x${inspection.imageHeight} do not match expected ${selectedJob.size}`);
    }
  } catch (error) {
    errors.push(error.message);
  }

  return { asset, errors };
};

const renderMarkdown = ({ report }) => [
  '# Frontend Design Boost Image Evidence',
  '',
  `Evidence mode: \`${report.evidenceMode}\``,
  `Jobs manifest: \`${report.jobsPath || 'not supplied'}\``,
  `Built-in imagegen handoff: \`${report.builtInHandoff.path || 'not supplied'}\``,
  `Runner report: \`${report.runnerReport.path || 'not supplied'}\``,
  `Selected job: \`${report.selectedJob.id}\``,
  `Model: \`${report.model}\``,
  `Transport: \`${report.transport}\``,
  '',
  '## Evidence Status',
  '',
  `- Live generation evidence: ${report.liveGenerationEvidence ? 'yes' : 'no'}`,
  `- Asset path: \`${report.asset.path}\``,
  `- Asset dimensions: ${report.asset.dimensions ? `${report.asset.dimensions.width}x${report.asset.dimensions.height}` : 'unknown'}`,
  `- Expected dimensions: ${report.asset.expectedSize || 'unknown'}`,
  `- Runner executed: ${report.runnerReport.executed ? 'yes' : 'no'}`,
  `- Built-in imagegen handoff valid: ${report.builtInHandoff.valid ? 'yes' : 'no'}`,
  `- Built-in route does not require \`OPENAI_API_KEY\`: ${report.builtInHandoff.requiresOpenAiApiKey === false ? 'yes' : 'not verified'}`,
  '',
  '## Blockers',
  '',
  ...(report.blockedBy.length > 0 ? report.blockedBy.map((item) => `- ${item}`) : ['- None.']),
  '',
  '## Next Gates',
  '',
  ...report.nextGates.map((gate) => `- ${gate}`),
  '',
  '## Handoff',
  '',
  '- Treat this as evidence that the bitmap exists and matches the selected gpt-image-2 job, not as UI approval.',
  '- Run asset smoke, asset intake, image decision, and desktop and mobile screenshot QA before implementation signoff.',
  '- Keep generated assets project-local and record accepted paths in the final frontend handoff.',
  ''
].join('\n');

const options = parseArgs();
const builtInHandoff = readBuiltInHandoff(options.handoffPath);
const evidenceMode = builtInHandoff.supplied ? 'built-in-imagegen-handoff' : 'cli-runner-report';

let resolvedJobsPath = null;
let jobsManifest = null;
let selectedJob = null;
if (evidenceMode === 'built-in-imagegen-handoff') {
  const selectedAssetId = options.assetId || options.jobId || builtInHandoff.assets?.[0]?.id || '';
  selectedJob = builtInHandoff.assets.find((asset) => asset.id === selectedAssetId);
  if (!selectedJob) fail(`No built-in imagegen handoff asset found for id: ${selectedAssetId}`);
  selectedJob = {
    id: selectedJob.id,
    label: selectedJob.label ?? selectedJob.id,
    outputPath: selectedJob.finalAssetPath ?? '',
    size: selectedJob.size ?? '',
    quality: selectedJob.quality ?? '',
    prompt: selectedJob.prompt ?? ''
  };
} else {
  resolvedJobsPath = path.resolve(options.jobsPath);
  jobsManifest = readJson(resolvedJobsPath, 'image generation jobs manifest');

  if (jobsManifest.schema !== 'frontend-design-boost-image-generation-jobs/v1') {
    fail(`Unsupported image generation jobs schema: ${jobsManifest.schema ?? 'missing'}`);
  }
  if (!Array.isArray(jobsManifest.jobs) || jobsManifest.jobs.length === 0) {
    fail('Image generation jobs manifest contains no jobs.');
  }

  selectedJob = options.jobId
    ? jobsManifest.jobs.find((job) => job.id === options.jobId)
    : jobsManifest.jobs[0];
  if (!selectedJob) fail(`No image generation job found for id: ${options.jobId}`);
}

const runnerReport = evidenceMode === 'cli-runner-report'
  ? readRunnerReport(options.runnerReportPath)
  : {
    supplied: false,
    valid: false,
    executed: false,
    path: '',
    errors: []
  };
const runnerErrors = evidenceMode === 'cli-runner-report'
  ? validateRunnerReport({ runnerReport, selectedJob, jobsManifest })
  : [];
const builtInHandoffErrors = evidenceMode === 'built-in-imagegen-handoff'
  ? validateBuiltInHandoff({ handoff: builtInHandoff, selectedJob })
  : [];
const { asset, errors: assetErrors } = validateAsset({ assetPath: options.assetPath, selectedJob });
const blockedBy = [...runnerErrors, ...builtInHandoffErrors, ...assetErrors];
const liveGenerationEvidence = blockedBy.length === 0
  && (runnerReport.executed === true || builtInHandoff.valid === true);

const outDir = path.resolve(options.outDir);
mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, 'image-evidence-report.json');
const markdownPath = path.join(outDir, 'image-evidence.md');
const report = {
  schema: 'frontend-design-boost-image-evidence/v1',
  ok: blockedBy.length === 0,
  executed: false,
  liveGenerationEvidence,
  evidenceMode,
  generatedAt: new Date().toISOString(),
  jobsPath: resolvedJobsPath ? toProjectPath(resolvedJobsPath) : '',
  reportPath: toProjectPath(reportPath),
  markdownPath: toProjectPath(markdownPath),
  model: evidenceMode === 'built-in-imagegen-handoff' ? builtInHandoff.model : jobsManifest.model ?? '',
  transport: evidenceMode === 'built-in-imagegen-handoff' ? 'built-in-imagegen' : jobsManifest.transport ?? '',
  selectedJob: {
    id: selectedJob.id,
    label: selectedJob.label ?? '',
    outputPath: selectedJob.outputPath ?? '',
    size: selectedJob.size ?? '',
    quality: selectedJob.quality ?? ''
  },
  runnerReport: {
    supplied: runnerReport.supplied,
    valid: runnerErrors.length === 0,
    executed: runnerReport.executed,
    path: runnerReport.path,
    schema: runnerReport.schema ?? '',
    model: runnerReport.model ?? '',
    transport: runnerReport.transport ?? '',
    exitCode: runnerReport.exitCode
  },
  builtInHandoff: {
    supplied: builtInHandoff.supplied,
    valid: builtInHandoffErrors.length === 0 && builtInHandoff.valid === true,
    path: builtInHandoff.path,
    schema: builtInHandoff.schema ?? '',
    model: builtInHandoff.model ?? '',
    executionMode: builtInHandoff.executionMode ?? '',
    requiresOpenAiApiKey: builtInHandoff.requiresOpenAiApiKey,
    sourceDefaultDirectory: builtInHandoff.sourceDefaultDirectory ?? ''
  },
  asset,
  blockedBy,
  nextGates: [
    'Run asset smoke against asset-selection.json.',
    'Run asset intake to update generated versus pending asset status.',
    'Run image decision before coding from the generated reference.',
    'Run desktop and mobile screenshot QA after wiring the asset into HTML, React, or Tailwind.'
  ],
  implementationHandoff: [
    'The generated bitmap can inform visual direction only after manual review.',
    'Extract palette roles, spacing rhythm, surface rules, and crop behavior before implementation.',
    'Do not treat generated UI text, fake data, or inaccessible layout details as production truth.'
  ]
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown({ report }), 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.ok ? 0 : 1);
