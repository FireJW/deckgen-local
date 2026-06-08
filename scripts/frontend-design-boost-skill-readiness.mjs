#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const repoSkillRoot = path.join(root, 'docs', 'frontend-design-boost', 'skill', 'frontend-design-boost');
const syncCommand = 'npm.cmd run sync:frontend-design-boost-skill -- --apply';
const relativeFiles = [
  'SKILL.md',
  path.join('agents', 'openai.yaml'),
  path.join('references', 'companion-skills.md')
];
const requiredMarkers = [
  'Image-Assisted Frontend Work',
  'gpt-image-2',
  'reference intake',
  'image-generation-jobs.json',
  'asset-selection bridge',
  'imagegen-handoff.json',
  'flow:frontend-design-boost:image',
  'acceptance:frontend-design-boost:image',
  'decision:frontend-design-boost:image',
  'evidence:frontend-design-boost:image',
  'handoff:frontend-design-boost:image',
  'import:frontend-design-boost:imagegen-assets',
  'acceptance:frontend-design-boost:imagegen-assets',
  'acceptance:frontend-design-boost:ccswitch-assets',
  'intake:frontend-design-boost:assets',
  'frontend-design-boost-image-workflow.mjs',
  'frontend-design-boost-image-acceptance.mjs',
  'frontend-design-boost-image-decision.mjs',
  'frontend-design-boost-image-evidence.mjs',
  'frontend-design-boost-image-implementation-handoff.mjs',
  'frontend-design-boost-imagegen-import.mjs',
  'frontend-design-boost-imagegen-acceptance.mjs',
  'frontend-design-boost-ccswitch-acceptance.mjs',
  'frontend-design-boost-image-jobs-run.mjs',
  'frontend-design-boost-asset-intake.mjs',
  'docs/frontend-design-boost/product-design-plugin-bridge.md',
  'frontend-design-boost-product-design-readiness.mjs',
  'frontend-design-boost-product-design-brief.mjs',
  'frontend-design-boost-product-design-ideate.mjs',
  'frontend-design-boost-product-design-qa.mjs',
  'frontend-design-boost-product-design-audit.mjs',
  'brief:frontend-design-boost:product-design',
  'ideate:frontend-design-boost:product-design',
  'design-qa:frontend-design-boost:product-design',
  'audit:frontend-design-boost:product-design',
  'docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md'
];

const usage = [
  'frontend-design-boost-skill-readiness [--installed-skill <path>] [--codex-home <path>]',
  '',
  'Read-only readiness report for the installed frontend-design-boost skill.',
  'This command never writes the installed skill.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const readOption = (args, name) => {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : null;
};

const candidateCodexHomes = (explicitCodexHome) => {
  if (explicitCodexHome) return [path.resolve(explicitCodexHome)];

  const candidates = [];
  if (process.env.CODEX_HOME) candidates.push(process.env.CODEX_HOME);
  candidates.push(path.resolve(root, '..', '..', 'AppData', 'codex'));
  if (process.env.APPDATA) candidates.push(path.join(path.dirname(process.env.APPDATA), 'codex'));
  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'codex'));
  if (process.platform === 'win32') candidates.push(path.join(os.homedir(), 'AppData', 'codex'));
  candidates.push(path.join(os.homedir(), '.codex'));
  return [...new Set(candidates.filter(Boolean).map((candidate) => path.resolve(candidate)))];
};

const resolveInstalledSkillRoot = (args) => {
  const explicitSkillRoot = readOption(args, '--installed-skill');
  if (explicitSkillRoot) return path.resolve(explicitSkillRoot);

  const homes = candidateCodexHomes(readOption(args, '--codex-home'));
  for (const home of homes) {
    const skillRoot = path.join(home, 'skills', 'frontend-design-boost');
    if (existsSync(skillRoot)) return skillRoot;
  }
  return path.join(homes[0] ?? path.join(os.homedir(), '.codex'), 'skills', 'frontend-design-boost');
};

const readNormalized = (filePath) => readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
const safeRead = (filePath) => {
  try {
    return readNormalized(filePath);
  } catch {
    return '';
  }
};
const toDisplayPath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const installedSkillRoot = resolveInstalledSkillRoot(args);
const installedSkillPath = path.join(installedSkillRoot, 'SKILL.md');
const installedSkillText = safeRead(installedSkillPath);
const missingMarkers = requiredMarkers.filter((marker) => !installedSkillText.includes(marker));
const comparedFiles = relativeFiles.map((relativeFile) => {
  const repoPath = path.join(repoSkillRoot, relativeFile);
  const installedPath = path.join(installedSkillRoot, relativeFile);
  const repoExists = existsSync(repoPath);
  const installedExists = existsSync(installedPath);
  const matches = repoExists && installedExists && readNormalized(repoPath) === readNormalized(installedPath);

  return {
    relativeFile,
    repoPath: toDisplayPath(repoPath),
    installedPath: toDisplayPath(installedPath),
    repoExists,
    installedExists,
    matches
  };
});
const staleFiles = comparedFiles.filter((file) => !file.matches);
const installedExists = existsSync(installedSkillRoot);
const ready = installedExists && staleFiles.length === 0 && missingMarkers.length === 0;
const blockerSummary = [];

if (!installedExists) blockerSummary.push('installed skill is missing');
if (staleFiles.length > 0) blockerSummary.push('installed skill is stale');
if (missingMarkers.length > 0) blockerSummary.push('installed skill is missing required workflow markers');

const report = {
  schema: 'frontend-design-boost-skill-readiness/v1',
  ok: true,
  executed: false,
  ready,
  approvalRequired: !ready,
  repoSkillRoot: toDisplayPath(repoSkillRoot),
  installedSkillRoot: toDisplayPath(installedSkillRoot),
  comparedFiles,
  staleFiles,
  requiredMarkers,
  missingMarkers,
  blockerSummary,
  syncCommand,
  nextSteps: ready
    ? ['Installed skill is current; run the repo QA gates before claiming workflow completion.']
    : [
      'Review this read-only report.',
      'Get explicit approval before writing outside the repo.',
      `Apply the installed skill sync with: ${syncCommand}`,
      'Run check:frontend-design-boost-skill after sync.'
    ],
  notes: [
    'This readiness report is read-only.',
    'Installed skill sync requires explicit approval because it writes outside this repo.',
    'Use this before relying on a new Codex session to call the latest frontend-design-boost workflow.'
  ]
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
