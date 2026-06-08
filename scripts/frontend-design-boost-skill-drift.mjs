#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const repoSkillRoot = path.join(root, 'docs', 'frontend-design-boost', 'skill', 'frontend-design-boost');
const relativeFiles = [
  'SKILL.md',
  path.join('agents', 'openai.yaml'),
  path.join('references', 'companion-skills.md')
];
const requiredSkillMarkers = [
  'deep-research-dag',
  'Reference-Backed Defaults',
  'Research dashboards',
  'docs/frontend-design-boost/image-assisted-frontend-workflow.md',
  'docs/frontend-design-boost/qa-gate-candidates.md',
  'docs/frontend-design-boost/react-performance-composition-checks.md',
  'docs/frontend-design-boost/frontend-debug-evidence-bundle.md',
  'docs/frontend-design-boost/product-design-plugin-bridge.md',
  'scripts/frontend-design-boost-product-design-readiness.mjs',
  'scripts/frontend-design-boost-product-design-brief.mjs',
  'scripts/frontend-design-boost-product-design-ideate.mjs',
  'scripts/frontend-design-boost-product-design-qa.mjs',
  'scripts/frontend-design-boost-product-design-audit.mjs',
  'brief:frontend-design-boost:product-design',
  'ideate:frontend-design-boost:product-design',
  'design-qa:frontend-design-boost:product-design',
  'audit:frontend-design-boost:product-design',
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
  'readiness:frontend-design-boost-skill',
  'asset-consumption-demo.html',
  'scripts/frontend-design-boost-image-assist.mjs',
  'scripts/frontend-design-boost-goal-audit.mjs',
  'scripts/frontend-design-boost-image-acceptance.mjs',
  'scripts/frontend-design-boost-image-decision.mjs',
  'scripts/frontend-design-boost-image-evidence.mjs',
  'scripts/frontend-design-boost-image-implementation-handoff.mjs',
  'scripts/frontend-design-boost-imagegen-import.mjs',
  'scripts/frontend-design-boost-imagegen-acceptance.mjs',
  'scripts/frontend-design-boost-ccswitch-acceptance.mjs',
  'scripts/frontend-design-boost-image-jobs-run.mjs',
  'scripts/frontend-design-boost-image-workflow.mjs',
  'scripts/frontend-design-boost-skill-readiness.mjs',
  'scripts/frontend-design-boost-image-pack-qa.mjs',
  'scripts/frontend-design-boost-image-jobs-plan.mjs',
  'scripts/frontend-design-boost-asset-intake.mjs',
  'fixtures/frontend-design-boost/image-assisted-brief.md',
  'fixtures/frontend-design-boost/reference-intake.md',
  'docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md',
  'docs/frontend-design-boost/case-library/shadcn-dashboard-block.md',
  'docs/frontend-design-boost/case-library/cloudscape-service-dashboard.md',
  'docs/frontend-design-boost/case-library/shopify-resource-index.md',
  'docs/frontend-design-boost/case-library/elastic-eui-data-grid.md',
  'docs/frontend-design-boost/case-library/govuk-task-list-flow.md',
  'docs/frontend-design-boost/case-library/stripe-api-reference.md',
  'docs/frontend-design-boost/case-library/tremor-chart-dashboard.md',
  'docs/frontend-design-boost/case-library/ant-design-pro-admin.md',
  'docs/frontend-design-boost/case-library/mui-x-data-grid.md'
];

const args = process.argv.slice(2);

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : null;
}

function candidateCodexHomes() {
  const candidates = [];
  if (process.env.CODEX_HOME) candidates.push(process.env.CODEX_HOME);
  candidates.push(path.resolve(root, '..', '..', 'AppData', 'codex'));
  if (process.env.APPDATA) candidates.push(path.join(path.dirname(process.env.APPDATA), 'codex'));
  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'codex'));
  if (process.platform === 'win32') {
    candidates.push(path.join(os.homedir(), 'AppData', 'codex'));
  }
  candidates.push(path.join(os.homedir(), '.codex'));
  return [...new Set(candidates.filter(Boolean).map((candidate) => path.resolve(candidate)))];
}

function resolveInstalledSkillRoot() {
  const explicitSkillRoot = readOption('--installed-skill');
  if (explicitSkillRoot) return path.resolve(explicitSkillRoot);

  const explicitCodexHome = readOption('--codex-home');
  const homes = explicitCodexHome ? [path.resolve(explicitCodexHome)] : candidateCodexHomes();
  for (const home of homes) {
    const skillRoot = path.join(home, 'skills', 'frontend-design-boost');
    if (existsSync(skillRoot)) return skillRoot;
  }
  return path.join(homes[0] ?? path.join(os.homedir(), '.codex'), 'skills', 'frontend-design-boost');
}

function readNormalized(filePath) {
  return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

const installedSkillRoot = resolveInstalledSkillRoot();
const errors = [];
const compared = [];

for (const relativeFile of relativeFiles) {
  const repoPath = path.join(repoSkillRoot, relativeFile);
  const installedPath = path.join(installedSkillRoot, relativeFile);

  if (!existsSync(repoPath)) {
    errors.push({ file: relativeFile, error: 'missing repo skill file', repoPath });
    continue;
  }
  if (!existsSync(installedPath)) {
    errors.push({ file: relativeFile, error: 'missing installed skill file', installedPath });
    continue;
  }

  const repoText = readNormalized(repoPath);
  const installedText = readNormalized(installedPath);
  const matches = repoText === installedText;
  compared.push({ file: relativeFile, matches });

  if (!matches) {
    errors.push({ file: relativeFile, error: 'installed file differs from repo draft' });
  }
}

const installedSkillPath = path.join(installedSkillRoot, 'SKILL.md');
if (existsSync(installedSkillPath)) {
  const installedSkill = readNormalized(installedSkillPath);
  for (const marker of requiredSkillMarkers) {
    if (!installedSkill.includes(marker)) {
      errors.push({ file: 'SKILL.md', error: 'missing required installed skill marker', marker });
    }
  }
}

const result = {
  ok: errors.length === 0,
  repoSkillRoot,
  installedSkillRoot,
  compared,
  requiredSkillMarkers,
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
