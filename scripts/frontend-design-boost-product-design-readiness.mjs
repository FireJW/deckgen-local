#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const coreSkills = [
  'index',
  'user-context',
  'get-context',
  'ideate',
  'prototype',
  'url-to-code',
  'image-to-code',
  'audit',
  'design-qa',
  'share'
];

const usage = [
  'frontend-design-boost-product-design-readiness [--plugin-root <path>] [--codex-home <path>]',
  '',
  'Read-only bridge report for the Product Design plugin cache.',
  'This command does not call Product Design, generate images, scaffold prototypes, install dependencies, or write outside this repo.'
].join('\n');

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

const toDisplayPath = (filePath) => path.relative(root, filePath).split(path.sep).join('/');
const safeReadJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
};

const isProductDesignRoot = (candidate) => {
  if (!candidate) return false;
  const pluginJsonPath = path.join(candidate, '.codex-plugin', 'plugin.json');
  const pluginJson = safeReadJson(pluginJsonPath);
  return pluginJson?.name === 'product-design';
};

const versionSort = (left, right) => {
  const parse = (value) => String(value).split('.').map((part) => Number(part) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (b[index] ?? 0) - (a[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return String(right).localeCompare(String(left));
};

const findPluginRoot = (args) => {
  const explicitRoot = readOption(args, '--plugin-root');
  if (explicitRoot) return path.resolve(explicitRoot);

  for (const home of candidateCodexHomes(readOption(args, '--codex-home'))) {
    const roots = [
      path.join(home, 'plugins', 'cache', 'openai-curated-remote', 'product-design'),
      path.join(home, 'plugins', 'cache', 'openai-curated', 'product-design')
    ];

    for (const versionsRoot of roots) {
      if (!existsSync(versionsRoot)) continue;
      const versions = readdirSync(versionsRoot)
        .filter((entry) => isProductDesignRoot(path.join(versionsRoot, entry)))
        .sort(versionSort);
      if (versions.length > 0) return path.join(versionsRoot, versions[0]);
    }
  }

  return null;
};

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const pluginRoot = findPluginRoot(args);
const pluginJsonPath = pluginRoot ? path.join(pluginRoot, '.codex-plugin', 'plugin.json') : null;
const pluginJson = pluginJsonPath ? safeReadJson(pluginJsonPath) : null;
const skillStatuses = coreSkills.map((skill) => {
  const skillPath = pluginRoot ? path.join(pluginRoot, 'skills', skill, 'SKILL.md') : null;
  return {
    skill,
    path: skillPath ? toDisplayPath(skillPath) : null,
    exists: Boolean(skillPath && existsSync(skillPath))
  };
});
const missingCoreSkills = skillStatuses.filter((status) => !status.exists).map((status) => status.skill);
const detected = Boolean(pluginRoot && pluginJson?.name === 'product-design');
const readyForBridge = detected && missingCoreSkills.length === 0;

const report = {
  schema: 'frontend-design-boost-product-design-readiness/v1',
  ok: true,
  executed: false,
  readyForBridge,
  pluginCache: {
    detected,
    pluginRoot: pluginRoot ? toDisplayPath(pluginRoot) : null,
    pluginJsonPath: pluginJsonPath ? toDisplayPath(pluginJsonPath) : null,
    name: pluginJson?.name ?? null,
    version: pluginJson?.version ?? null,
    source: pluginRoot?.includes('openai-curated-remote') ? 'openai-curated-remote/product-design' : null
  },
  currentSession: {
    callableAssumed: false,
    reason: 'This report inspects the local plugin cache only. Treat @Product Design as callable only when the current Codex session exposes the plugin or its skills.',
    callableProbe: 'tool_search query: product design plugin figma design ui ux'
  },
  coreSkills: skillStatuses,
  missingCoreSkills,
  bridgeDoc: 'docs/frontend-design-boost/product-design-plugin-bridge.md',
  recommendedRouting: [
    'If @Product Design is callable in the current session, use its get-context gate before ideate, prototype, url-to-code, image-to-code, audit, or share.',
    'If @Product Design is not callable, use the frontend-design-boost fallback: classify page type, gather source evidence, use image-assisted direction when needed, and finish with Browser/Playwright screenshot QA.',
    'For new product or redesign work with no visual target, apply No Visual Target, No Build: confirm a brief, create or collect three visual options, then wait for selection before implementation.',
    'For built prototypes or image/url-to-code work, require design-qa.md with final result: passed before handoff.'
  ],
  fallbackWorkflow: {
    briefGate: 'frontend-design-boost page-type preflight plus Product Design get-context style playback',
    visualDirection: 'flow:frontend-design-boost:image and gpt-image-2 route when visual options are needed',
    implementationGate: 'image implementation handoff, state checklist, desktop/mobile screenshot QA',
    auditGate: 'frontend_debug_evidence_bundle/v1 plus visual QA checklist when debugging or critiquing existing UI'
  },
  nextSteps: readyForBridge
    ? [
      'Use @Product Design directly when it appears in the current session tools.',
      'When it does not appear, use this bridge report and the local frontend-design-boost fallback workflow.'
    ]
    : [
      'Install or enable the Product Design plugin if direct @Product Design routing is required.',
      'Continue with the local frontend-design-boost fallback workflow until the plugin is callable.'
    ],
  notes: [
    'This command is read-only.',
    'It does not install Product Design or write saved user context.',
    'It does not relax repo approval gates for dependency installs, prototype scaffolding, deployment, or writing outside the selected repo.'
  ]
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
