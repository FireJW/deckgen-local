#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');

const usage = [
  'frontend-design-boost-image-pack-qa [--brief <path>] [--reference-intake <path>] [--out-dir <dir>]',
  '',
  'Rebuild and statically validate the image-assisted prompt pack preview.',
  'This command does not launch a browser or call the image API.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { briefPath: '', referenceIntakePath: '', outDir: defaultOutDir };

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
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const relativePath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');

const readRequired = (filePath) => {
  if (!existsSync(filePath)) {
    fail(`Missing required prompt-pack artifact: ${relativePath(filePath)}`);
  }
  return readFileSync(filePath, 'utf8');
};

const check = (checks, ok, label, details = '') => {
  const result = { ok: Boolean(ok), label };
  if (details) result.details = details;
  checks.push(result);
  if (!result.ok) {
    fail(`Image prompt-pack QA failed: ${label}${details ? ` (${details})` : ''}`);
  }
};

const contains = (text, expected) => text.includes(expected);

const { briefPath, referenceIntakePath, outDir } = parseArgs();
const resolvedOutDir = path.resolve(outDir);
const imageAssistScript = path.join(root, 'scripts', 'frontend-design-boost-image-assist.mjs');
const imageAssistArgs = ['--out-dir', resolvedOutDir];
if (briefPath) imageAssistArgs.push('--brief', briefPath);
if (referenceIntakePath) imageAssistArgs.push('--reference-intake', referenceIntakePath);

execFileSync(process.execPath, [imageAssistScript, ...imageAssistArgs], {
  cwd: root,
  stdio: 'inherit'
});

const manifestPath = path.join(resolvedOutDir, 'image-prompts.json');
const selectionPath = path.join(resolvedOutDir, 'asset-selection.json');
const jobsPath = path.join(resolvedOutDir, 'image-generation-jobs.json');
const handoffPath = path.join(resolvedOutDir, 'imagegen-handoff.json');
const handoffMarkdownPath = path.join(resolvedOutDir, 'imagegen-handoff.md');
const previewPath = path.join(resolvedOutDir, 'preview.html');
const consumptionDemoPath = path.join(resolvedOutDir, 'asset-consumption-demo.html');
const readmePath = path.join(resolvedOutDir, 'README.md');
const commandsPath = path.join(resolvedOutDir, 'imagegen-commands.ps1');
const reportPath = path.join(resolvedOutDir, 'qa-report.json');

const manifestText = readRequired(manifestPath);
const selectionText = readRequired(selectionPath);
const jobsText = readRequired(jobsPath);
const handoffText = readRequired(handoffPath);
const handoffMarkdown = readRequired(handoffMarkdownPath);
const preview = readRequired(previewPath);
const consumptionDemo = readRequired(consumptionDemoPath);
const readme = readRequired(readmePath);
const commands = readRequired(commandsPath);

let manifest;
let selection;
let jobs;
let handoff;
try {
  manifest = JSON.parse(manifestText);
} catch (error) {
  fail(`Unable to parse ${relativePath(manifestPath)}: ${error.message}`);
}

try {
  selection = JSON.parse(selectionText);
} catch (error) {
  fail(`Unable to parse ${relativePath(selectionPath)}: ${error.message}`);
}

try {
  jobs = JSON.parse(jobsText);
} catch (error) {
  fail(`Unable to parse ${relativePath(jobsPath)}: ${error.message}`);
}

try {
  handoff = JSON.parse(handoffText);
} catch (error) {
  fail(`Unable to parse ${relativePath(handoffPath)}: ${error.message}`);
}

const checks = [];
check(checks, manifest.schema === 'frontend-design-boost-image-prompt-pack/v1', 'manifest schema');
check(checks, manifest.model === 'gpt-image-2', 'gpt-image-2 model recorded');
check(checks, manifest.transport === 'built-in-imagegen', 'default built-in imagegen transport recorded');
check(checks, manifest.defaultRoute?.transport === 'built-in-imagegen', 'default route records built-in imagegen');
check(checks, manifest.defaultRoute?.requiresOpenAiApiKey === false, 'default route does not require OPENAI_API_KEY');
check(checks, Array.isArray(manifest.environmentRequirements) && manifest.environmentRequirements.length === 0, 'default route has no environment requirements');
check(checks, manifest.fallbackRoute?.transport === 'ccswitch', 'fallback ccswitch transport recorded');
check(checks, Array.isArray(manifest.fallbackRoute?.environmentRequirements) && manifest.fallbackRoute.environmentRequirements.includes('OPENAI_API_KEY'), 'fallback route records OPENAI_API_KEY requirement');
check(checks, jobs.schema === 'frontend-design-boost-image-generation-jobs/v1', 'image generation job manifest schema');
check(checks, jobs.model === 'gpt-image-2', 'job manifest model recorded');
check(checks, jobs.transport === 'ccswitch', 'job manifest transport recorded');
check(checks, jobs.routeRole === 'cli-fallback', 'job manifest route role recorded');
check(checks, jobs.executionMode === 'approval-gated', 'job manifest execution mode recorded');
check(checks, manifest.briefProfile && Array.isArray(manifest.briefProfile.signals), 'brief profile extracted');
check(checks, manifest.assets.some((asset) => asset.prompt.includes('Page type:')), 'asset prompts include brief context');
if (referenceIntakePath) {
  check(checks, manifest.referenceProfile?.enabled === true, 'reference intake parsed');
  check(checks, Boolean(manifest.sourceReferenceIntake), 'reference intake source recorded');
  check(checks, manifest.assets.some((asset) => asset.prompt.includes('Reference intake:')), 'asset prompts include reference intake');
  check(checks, selection.referenceProfile?.enabled === true, 'asset selection carries reference intake');
  check(checks, contains(preview, 'Reference intake'), 'preview contains reference intake');
} else {
  check(checks, manifest.referenceProfile?.enabled === false, 'reference intake optional by default');
}
check(checks, Array.isArray(manifest.assets) && manifest.assets.length >= 3, 'at least three prompt assets');
check(checks, manifest.assets.every((asset) => asset.prompt && asset.outputPath && asset.size && asset.quality), 'asset prompt completeness');
check(checks, manifest.assetSelectionPath && manifest.assetConsumptionDemoPath, 'manifest records asset bridge artifacts');
check(checks, manifest.generationJobsPath && jobs.jobs && Array.isArray(jobs.jobs), 'manifest records generation jobs artifact');
check(checks, manifest.imagegenHandoffPath && manifest.imagegenHandoffMarkdownPath, 'manifest records built-in imagegen handoff artifacts');
check(checks, handoff.schema === 'frontend-design-boost-imagegen-handoff/v1', 'built-in imagegen handoff schema');
check(checks, handoff.executionMode === 'codex-built-in-imagegen-handoff', 'built-in imagegen handoff execution mode');
check(checks, handoff.requiresOpenAiApiKey === false, 'built-in imagegen handoff does not require OPENAI_API_KEY');
check(checks, handoff.model === 'gpt-image-2', 'built-in imagegen handoff model recorded');
check(checks, Array.isArray(handoff.assets) && handoff.assets.length === manifest.assets.length, 'built-in imagegen handoff asset count');
check(checks, handoff.assets.every((asset) => asset.prompt && asset.finalAssetPath && asset.generatedImagesSource === 'CODEX_HOME/generated_images'), 'built-in imagegen handoff asset completeness');
check(checks, contains(handoffMarkdown, 'built-in image_gen'), 'built-in imagegen handoff markdown names route');
check(checks, contains(handoffMarkdown, 'does not require `OPENAI_API_KEY`'), 'built-in imagegen handoff markdown names key behavior');
check(checks, jobs.jobs.length === manifest.assets.length, 'generation job count matches assets');
check(checks, jobs.jobs.every((job) => job.prompt && job.command && job.dryRunCommand && job.outputPath && job.status), 'generation job completeness');
check(checks, jobs.jobs.every((job) => Array.isArray(job.commandParts) && Array.isArray(job.dryRunCommandParts)), 'generation jobs include structured command parts');
check(checks, jobs.jobs.every((job) => job.command.includes('gpt-image-2') && !job.command.includes('--dry-run')), 'generation jobs include executable commands');
check(checks, jobs.jobs.every((job) => job.dryRunCommand.includes('--dry-run')), 'generation jobs include dry-run commands');
check(checks, jobs.jobs.every((job) => job.commandParts.includes('gpt-image-2') && !job.commandParts.includes('--dry-run')), 'structured executable commands preserve gpt-image-2');
check(checks, jobs.jobs.every((job) => job.dryRunCommandParts.includes('--dry-run')), 'structured dry-run commands preserve dry-run mode');
check(checks, jobs.jobs.every((job) => job.status === 'ready_to_run'), 'generation jobs are ready to run');
check(checks, selection.schema === 'frontend-design-boost-asset-selection/v1', 'asset selection schema');
check(checks, selection.sourcePromptPack === 'image-prompts.json', 'asset selection source prompt pack');
check(checks, Array.isArray(selection.implementationTargets) && selection.implementationTargets.length >= 3, 'asset selection targets');
check(checks, selection.implementationTargets.every((target) => target.outputPath && target.projectPath && target.status), 'asset selection target completeness');
check(checks, Array.isArray(manifest.sections?.['Extraction Checklist']), 'Extraction Checklist section');
check(checks, Array.isArray(manifest.sections?.['Screenshot QA']), 'Screenshot QA section');
check(checks, contains(preview, 'Prompt pack'), 'preview contains prompt pack section');
check(checks, contains(preview, 'Built-in imagegen handoff'), 'preview contains built-in imagegen handoff');
check(checks, contains(preview, 'Extraction checklist'), 'preview contains extraction checklist');
check(checks, contains(preview, 'Screenshot QA'), 'preview contains screenshot QA');
check(checks, contains(preview, 'Built-in route: no OPENAI_API_KEY'), 'preview names default built-in route key behavior');
check(checks, contains(preview, 'CLI fallback: OPENAI_API_KEY'), 'preview names CLI fallback environment gate');
check(checks, contains(preview, 'asset-card'), 'preview renders asset cards');
check(checks, contains(preview, 'Selection demo'), 'preview links the selection demo');
check(checks, contains(consumptionDemo, 'Selected assets'), 'consumption demo contains selected assets heading');
check(checks, contains(consumptionDemo, 'asset-consumption-demo.html'), 'consumption demo names itself');
check(checks, contains(consumptionDemo, 'project-local asset paths'), 'consumption demo names project-local paths');
check(checks, contains(consumptionDemo, 'data-asset-slot="hero"'), 'consumption demo includes hero slot');
check(checks, contains(consumptionDemo, 'data-asset-slot="empty-state"'), 'consumption demo includes empty-state slot');
check(checks, contains(commands, 'image_gen.py'), 'commands reference imagegen CLI');
check(checks, contains(commands, 'gpt-image-2'), 'commands preserve gpt-image-2 model');
check(checks, contains(commands, '--dry-run'), 'commands default to dry-run');
check(checks, contains(readme, 'lab:frontend-design-boost:image'), 'README names rebuild command');

const report = {
  ok: true,
  generatedAt: new Date().toISOString(),
  outDir: relativePath(resolvedOutDir),
  artifacts: {
    manifest: relativePath(manifestPath),
    selection: relativePath(selectionPath),
    consumptionDemo: relativePath(consumptionDemoPath),
    imagegenHandoff: relativePath(handoffPath),
    imagegenHandoffMarkdown: relativePath(handoffMarkdownPath),
    preview: relativePath(previewPath),
    readme: relativePath(readmePath),
    commands: relativePath(commandsPath),
    report: relativePath(reportPath)
  },
  sourceBrief: manifest.sourceBrief,
  sourceReferenceIntake: manifest.sourceReferenceIntake,
  briefProfile: manifest.briefProfile,
  referenceProfile: manifest.referenceProfile,
  model: manifest.model,
  transport: manifest.transport,
  assetCount: manifest.assets.length,
  jobCount: jobs.jobs.length,
  assetBridgeCount: selection.implementationTargets.length,
  'asset selection manifest': relativePath(selectionPath),
  'asset consumption demo': relativePath(consumptionDemoPath),
  'built-in imagegen handoff': relativePath(handoffPath),
  'image generation job manifest': relativePath(jobsPath),
  extractionChecks: manifest.sections['Extraction Checklist'].length,
  screenshotQAChecks: manifest.sections['Screenshot QA'].length,
  browserScreenshots: 'not-run',
  browserScreenshotsNote: 'This QA command is static by default. Run the generated preview through browser QA when browser automation is approved for the environment.',
  checks
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
