#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultPackDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultHandoffPath = path.join(defaultPackDir, 'imagegen-handoff.json');
const defaultOutDir = defaultPackDir;

const usage = [
  'frontend-design-boost-imagegen-acceptance [--handoff <path>] [--asset-id <id>] [--source <png>] [--source-dir <dir>] [--jobs <path>] [--installed-skill <path>] [--codex-home <path>] [--out-dir <dir>]',
  '',
  'Validate the built-in imagegen post-generation path: import, asset smoke, image evidence, and read-only goal audit.',
  'This command does not call image generation APIs.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    handoffPath: defaultHandoffPath,
    assetId: '',
    sourcePath: '',
    sourceDir: '',
    jobsPath: '',
    installedSkillPath: '',
    codexHome: '',
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

    if (flag === '--handoff') {
      options.handoffPath = value;
    } else if (flag === '--asset-id') {
      options.assetId = value;
    } else if (flag === '--source') {
      options.sourcePath = value;
    } else if (flag === '--source-dir') {
      options.sourceDir = value;
    } else if (flag === '--jobs') {
      options.jobsPath = value;
    } else if (flag === '--installed-skill') {
      options.installedSkillPath = value;
    } else if (flag === '--codex-home') {
      options.codexHome = value;
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
  return relative.startsWith('..') ? absolutePath.split(path.sep).join('/') : relative;
};

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) fail(`Missing ${label}: ${toProjectPath(filePath)}`);
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Unable to parse ${label}: ${error.message}`);
  }
};

const runJsonScript = (scriptPath, args) => {
  try {
    return JSON.parse(execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: root,
      encoding: 'utf8'
    }));
  } catch (error) {
    const stdout = String(error.stdout ?? '').trim();
    if (stdout) {
      try {
        return JSON.parse(stdout);
      } catch {
        // Fall through to a useful error.
      }
    }
    throw error;
  }
};

const renderMarkdown = (report) => [
  '# Frontend Design Boost Imagegen Acceptance',
  '',
  `Handoff: \`${report.handoffPath}\``,
  `Asset: \`${report.assetId}\``,
  `Route: \`${report.route}\``,
  '',
  '## Gate Results',
  '',
  `- Import: ${report.importReport.ok ? 'pass' : 'fail'}`,
  `- Asset smoke: ${report.assetSmoke.ok ? 'pass' : 'fail'}`,
  `- Image evidence: ${report.imageEvidence.liveGenerationEvidence ? 'pass' : 'fail'}`,
  `- Goal audit: ${report.goalAudit.goalComplete ? 'complete' : 'blocked'}`,
  `- Implementation handoff: ${report.implementationHandoff?.readyForImplementation ? 'pass' : 'blocked'}`,
  '',
  '## Artifacts',
  '',
  `- Import report: \`${report.importReport.reportPath}\``,
  `- Image evidence: \`${report.evidencePath}\``,
  `- Goal audit: \`${report.goalAuditPath}\``,
  `- Implementation handoff: \`${report.implementationHandoffPath || 'not written'}\``,
  '',
  '## Next Gates',
  '',
  ...report.nextGates.map((gate) => `- ${gate}`),
  ''
].join('\n');

const options = parseArgs();
const resolvedHandoffPath = path.resolve(options.handoffPath);
const outDir = path.resolve(options.outDir);
mkdirSync(outDir, { recursive: true });

const handoff = readJson(resolvedHandoffPath, 'built-in imagegen handoff');
if (handoff.schema !== 'frontend-design-boost-imagegen-handoff/v1') {
  fail(`Unsupported imagegen handoff schema: ${handoff.schema ?? 'missing'}`);
}
const assetId = options.assetId || handoff.assets?.[0]?.id || '';
const selectedAsset = Array.isArray(handoff.assets)
  ? handoff.assets.find((asset) => asset.id === assetId)
  : null;
if (!selectedAsset) fail(`No handoff asset found for id: ${assetId}`);

const importScript = path.join(root, 'scripts', 'frontend-design-boost-imagegen-import.mjs');
const smokeScript = path.join(root, 'scripts', 'frontend-design-boost-asset-smoke.mjs');
const evidenceScript = path.join(root, 'scripts', 'frontend-design-boost-image-evidence.mjs');
const goalAuditScript = path.join(root, 'scripts', 'frontend-design-boost-goal-audit.mjs');
const intakeScript = path.join(root, 'scripts', 'frontend-design-boost-asset-intake.mjs');
const decisionScript = path.join(root, 'scripts', 'frontend-design-boost-image-decision.mjs');
const implementationHandoffScript = path.join(root, 'scripts', 'frontend-design-boost-image-implementation-handoff.mjs');
const selectionPath = path.resolve(root, handoff.assetSelectionPath ?? path.join(path.dirname(toProjectPath(resolvedHandoffPath)), 'asset-selection.json'));
const manifestPath = path.resolve(path.dirname(resolvedHandoffPath), handoff.sourcePromptPack ?? 'image-prompts.json');
const jobsPath = path.resolve(options.jobsPath || path.join(path.dirname(resolvedHandoffPath), 'image-generation-jobs.json'));

const importArgs = ['--handoff', resolvedHandoffPath, '--asset-id', assetId, '--out-dir', outDir];
if (options.sourcePath) importArgs.push('--source', options.sourcePath);
if (options.sourceDir) importArgs.push('--source-dir', options.sourceDir);
const importReport = runJsonScript(importScript, importArgs);

const assetPath = path.resolve(root, selectedAsset.finalAssetPath);
const assetSmoke = runJsonScript(smokeScript, [
  '--selection',
  selectionPath,
  '--asset-id',
  assetId
]);

const imageEvidence = runJsonScript(evidenceScript, [
  '--handoff',
  resolvedHandoffPath,
  '--asset-id',
  assetId,
  '--asset',
  assetPath,
  '--out-dir',
  outDir
]);

const reportPath = path.join(outDir, 'imagegen-acceptance-report.json');
const markdownPath = path.join(outDir, 'imagegen-acceptance.md');
const goalAuditPath = path.join(outDir, 'goal-audit-report.json');
const blockedBy = [
  ...(importReport.ok ? [] : [{ gate: 'import', errors: importReport.blockedBy ?? importReport.assets?.flatMap((asset) => asset.errors ?? []) ?? [] }]),
  ...(assetSmoke.ok ? [] : [{ gate: 'asset-smoke', errors: assetSmoke.errors ?? [] }]),
  ...(imageEvidence.liveGenerationEvidence ? [] : [{ gate: 'image-evidence', errors: imageEvidence.blockedBy ?? [] }])
];
const report = {
  schema: 'frontend-design-boost-imagegen-acceptance/v1',
  ok: blockedBy.length === 0,
  executed: false,
  route: 'built-in-imagegen',
  model: handoff.model ?? '',
  assetId,
  handoffPath: toProjectPath(resolvedHandoffPath),
  assetPath: toProjectPath(assetPath),
  importReport,
  assetSmoke,
  imageEvidence,
  evidencePath: imageEvidence.reportPath,
  goalAudit: null,
  goalAuditPath: toProjectPath(goalAuditPath),
  assetIntake: null,
  assetDecision: null,
  implementationHandoff: null,
  implementationHandoffPath: '',
  reportPath: toProjectPath(reportPath),
  markdownPath: toProjectPath(markdownPath),
  blockedBy,
  nextGates: [
    'Review the generated image implementation handoff before coding from the imported asset.',
    'Wire the accepted asset into the UI using project-local paths.',
    'Run desktop and mobile screenshot QA before final handoff.'
  ],
  generatedAt: new Date().toISOString()
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
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
  '--acceptance',
  reportPath,
  '--asset-id',
  assetId,
  '--out-dir',
  outDir
]);
report.assetIntake = assetIntake;
report.assetDecision = assetDecision;
report.implementationHandoff = implementationHandoff;
report.implementationHandoffPath = implementationHandoff.reportPath;
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
const goalAuditArgs = [
  '--jobs',
  jobsPath,
  '--live-evidence',
  path.resolve(root, imageEvidence.reportPath),
  '--imagegen-acceptance',
  reportPath,
  '--implementation-handoff',
  path.resolve(root, implementationHandoff.reportPath)
];
if (options.installedSkillPath) goalAuditArgs.push('--installed-skill', options.installedSkillPath);
if (options.codexHome) goalAuditArgs.push('--codex-home', options.codexHome);
const goalAudit = runJsonScript(goalAuditScript, goalAuditArgs);
report.goalAudit = goalAudit;
writeFileSync(goalAuditPath, `${JSON.stringify(goalAudit, null, 2)}\n`, 'utf8');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(report.ok ? 0 : 1);
