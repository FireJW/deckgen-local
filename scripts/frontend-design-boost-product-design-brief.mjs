#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'product-design-brief');
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
const taskKinds = new Set([
  'product-idea',
  'prototype',
  'redesign',
  'url-to-code',
  'image-to-code',
  'audit',
  'ui-edit'
]);
const interactivityLevels = new Set(['static', 'full']);

const usage = [
  'frontend-design-boost-product-design-brief --brief <path> [--visual-source <url-or-path>] [--task-kind <kind>] [--interactivity <static|full>] [--out-dir <path>] [--plugin-root <path>] [--codex-home <path>]',
  '',
  'Create a repo-local Product Design task brief preflight.',
  'This command does not call Product Design, generate images, install dependencies, or write outside this repo.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const readOption = (args, name) => {
  const index = args.indexOf(name);
  if (index === -1) return '';
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : '';
};

const normalizeNewlines = (value) => String(value ?? '').replace(/\r\n/g, '\n');
const normalizeDisplayPath = (filePath) => String(filePath ?? '').replace(/\\/g, '/');
const toProjectPath = (filePath) => {
  if (!filePath) return '';
  const absolutePath = path.resolve(filePath);
  const relative = path.relative(root, absolutePath).split(path.sep).join('/');
  return relative.startsWith('..') || path.isAbsolute(relative)
    ? normalizeDisplayPath(absolutePath)
    : relative;
};
const isPathInside = (childPath, parentPath) => {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};
const resolveRepoPath = (filePath) => {
  if (!filePath) return '';
  return path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
};
const safeReadJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
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

const isProductDesignRoot = (candidate) => {
  if (!candidate) return false;
  return safeReadJson(path.join(candidate, '.codex-plugin', 'plugin.json'))?.name === 'product-design';
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

const findPluginRoot = ({ pluginRoot, codexHome }) => {
  if (pluginRoot) return path.resolve(pluginRoot);

  for (const home of candidateCodexHomes(codexHome)) {
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

  return '';
};

const auditProductDesignBridge = (options) => {
  const pluginRoot = findPluginRoot(options);
  const pluginJsonPath = pluginRoot ? path.join(pluginRoot, '.codex-plugin', 'plugin.json') : '';
  const pluginJson = pluginJsonPath ? safeReadJson(pluginJsonPath) : null;
  const detected = Boolean(pluginRoot && pluginJson?.name === 'product-design');
  const coreSkillStatuses = coreSkills.map((skill) => {
    const skillPath = pluginRoot ? path.join(pluginRoot, 'skills', skill, 'SKILL.md') : '';
    return {
      skill,
      path: skillPath ? toProjectPath(skillPath) : '',
      exists: Boolean(skillPath && existsSync(skillPath))
    };
  });
  const missingCoreSkills = coreSkillStatuses.filter((status) => !status.exists).map((status) => status.skill);
  const readyForBridge = detected && missingCoreSkills.length === 0;

  return {
    status: readyForBridge ? 'ready' : detected ? 'incomplete' : 'missing',
    readyForBridge,
    bridgeDoc: 'docs/frontend-design-boost/product-design-plugin-bridge.md',
    pluginCache: {
      detected,
      pluginRoot: pluginRoot ? toProjectPath(pluginRoot) : '',
      pluginJsonPath: pluginJsonPath ? toProjectPath(pluginJsonPath) : '',
      name: pluginJson?.name ?? '',
      version: pluginJson?.version ?? '',
      source: pluginRoot?.includes('openai-curated-remote') ? 'openai-curated-remote/product-design' : ''
    },
    currentSession: {
      callableAssumed: false,
      reason: 'This preflight inspects local cache readiness only. Treat @Product Design as callable only when the current session exposes the plugin or its skills.'
    },
    coreSkills: coreSkillStatuses,
    missingCoreSkills,
    readinessCommand: 'npm.cmd run readiness:frontend-design-boost:product-design'
  };
};

const classifyVisualSource = (visualSource) => {
  const source = String(visualSource ?? '').trim();
  if (!source) return { type: 'none', value: '' };
  if (/^https?:\/\//i.test(source)) return { type: 'url', value: source };
  if (/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(source)) return { type: 'image', value: normalizeDisplayPath(source) };
  if (/\.(html?|tsx?|jsx?|vue|svelte)$/i.test(source)) return { type: 'code', value: normalizeDisplayPath(source) };
  return { type: 'file', value: normalizeDisplayPath(source) };
};

const extractBriefSnapshot = (briefText) => {
  const normalized = normalizeNewlines(briefText);
  const heading = normalized.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? 'Untitled frontend task';
  const lower = normalized.toLowerCase();
  const pageType = lower.includes('dashboard')
    ? 'operational dashboard'
    : lower.includes('landing')
      ? 'landing page'
      : lower.includes('report')
        ? 'data report'
        : 'product UI';
  const densityTarget = lower.includes('dense') || lower.includes('compact')
    ? 'dense'
    : lower.includes('airy')
      ? 'airy'
      : 'balanced';
  const stateCoverage = ['hover', 'focus', 'loading', 'empty', 'error', 'disabled']
    .filter((state) => lower.includes(state));
  const antiPatterns = [
    ['gradient', 'gradient abuse'],
    ['hero', 'landing hero misuse'],
    ['card-inside-card', 'cards inside cards'],
    ['oversized corner radius', 'oversized radius'],
    ['monochrome', 'monochrome weak hierarchy']
  ]
    .filter(([needle]) => lower.includes(needle))
    .map(([, label]) => label);

  return {
    title: heading,
    pageType,
    densityTarget,
    stateCoverage,
    antiPatterns,
    excerpt: normalized.split('\n').filter(Boolean).slice(0, 8).join('\n'),
    wordCount: normalized.trim() ? normalized.trim().split(/\s+/).length : 0
  };
};

const decideRoute = ({ taskKind, interactivity, visualSourceType }) => {
  const hasVisualTarget = visualSourceType !== 'none';
  const needsVisualTarget = ['product-idea', 'prototype', 'redesign', 'url-to-code', 'image-to-code'].includes(taskKind);
  let recommendedPluginSkill = 'prototype';
  let localFallback = 'frontend-design-boost page-type preflight plus desktop/mobile screenshot QA';

  if (taskKind === 'audit') {
    recommendedPluginSkill = 'audit';
    localFallback = 'frontend_debug_evidence_bundle/v1 plus visual QA checklist';
  } else if (visualSourceType === 'url' || taskKind === 'url-to-code') {
    recommendedPluginSkill = hasVisualTarget ? 'url-to-code' : 'ideate';
    localFallback = hasVisualTarget
      ? 'capture source evidence, then implement with frontend-design-boost and Playwright QA'
      : 'create or collect a URL/source target before url-to-code work';
  } else if (visualSourceType === 'image' || taskKind === 'image-to-code') {
    recommendedPluginSkill = hasVisualTarget ? 'image-to-code' : 'ideate';
    localFallback = hasVisualTarget
      ? 'use image implementation handoff, then implement with frontend-design-boost and screenshot QA'
      : 'create or collect three visual directions before image-to-code work';
  } else if (!hasVisualTarget && needsVisualTarget) {
    recommendedPluginSkill = 'ideate';
    localFallback = 'flow:frontend-design-boost:image for three visual directions, then wait for selection';
  } else if (taskKind === 'ui-edit') {
    recommendedPluginSkill = interactivity === 'full' ? 'prototype' : 'audit';
    localFallback = 'repo-native frontend-design-boost edit with state checklist and screenshot QA';
  }

  const noVisualTargetGate = needsVisualTarget && !hasVisualTarget;
  const designQaRequired = ['url-to-code', 'image-to-code', 'prototype', 'redesign'].includes(taskKind) && hasVisualTarget;
  const readyForImplementation = !noVisualTargetGate && taskKind !== 'audit';

  return {
    firstPluginSkill: 'get-context',
    recommendedPluginSkill,
    localFallback,
    noVisualTargetGate,
    noVisualTargetRule: noVisualTargetGate
      ? 'No Visual Target, No Build: confirm the brief, create or collect three visual options, then wait for selection before implementation.'
      : '',
    readyForImplementation,
    designQaRequired,
    routeRationale: [
      'Start with Product Design get-context style brief playback.',
      hasVisualTarget
        ? `Visual source type is ${visualSourceType}, so the task can move toward ${recommendedPluginSkill}.`
        : 'No visual source was supplied, so prototype-like work must pause for ideation or source collection.',
      designQaRequired
        ? 'Prototype-like visual work needs source-vs-render comparison and design-qa.md before handoff.'
        : 'Use normal frontend-design-boost screenshot QA unless the work becomes source-vs-render prototype work.'
    ]
  };
};

const evidenceForRoute = ({ routeDecision, visualSourceType }) => {
  const evidence = [
    'brief playback approved by the user',
    'page type, audience, primary action, density target, and token preflight recorded'
  ];
  const handoff = [
    'route decision and fallback route',
    'component strategy and state coverage',
    'desktop 1440 x 900 and mobile 390 x 844 screenshot QA paths'
  ];

  if (routeDecision.noVisualTargetGate) {
    evidence.push('three visual directions from @Product Design ideate or flow:frontend-design-boost:image');
    evidence.push('selected visual target before implementation');
    handoff.push('selected visual direction or source target');
  }

  if (visualSourceType === 'url') {
    evidence.push('desktop source screenshot');
    evidence.push('mobile source screenshot');
    evidence.push('source interaction/state notes');
    evidence.push('asset, typography, spacing, and layout observations');
  }

  if (visualSourceType === 'image') {
    evidence.push('source image path and dimensions');
    evidence.push('image implementation handoff with token extraction notes');
  }

  if (routeDecision.designQaRequired) {
    handoff.push('design-qa.md with final result: passed');
    handoff.push('source viewport and rendered viewport comparison');
  }

  return {
    evidenceRequirements: evidence,
    handoffRequirements: handoff
  };
};

const renderMarkdown = (report) => [
  '# Product Design Task Brief',
  '',
  `Schema: \`${report.schema}\``,
  `External actions executed: \`${report.externalActionsExecuted}\``,
  '',
  '## Inputs',
  '',
  `- Brief: \`${report.inputs.briefPath}\``,
  `- Task kind: \`${report.inputs.taskKind}\``,
  `- Interactivity: \`${report.inputs.interactivity}\``,
  `- Visual source: \`${report.inputs.visualSource || 'none'}\``,
  `- Visual source type: \`${report.inputs.visualSourceType}\``,
  '',
  '## Brief Snapshot',
  '',
  `- Title: ${report.briefSnapshot.title}`,
  `- Page type: ${report.briefSnapshot.pageType}`,
  `- Density target: ${report.briefSnapshot.densityTarget}`,
  `- State coverage: ${report.briefSnapshot.stateCoverage.join(', ') || 'not explicit'}`,
  '',
  '## Route Decision',
  '',
  `- First Product Design skill: \`${report.routeDecision.firstPluginSkill}\``,
  `- Recommended Product Design skill: \`${report.routeDecision.recommendedPluginSkill}\``,
  `- Local fallback: ${report.routeDecision.localFallback}`,
  `- No Visual Target gate: \`${report.routeDecision.noVisualTargetGate}\``,
  `- Ready for implementation: \`${report.routeDecision.readyForImplementation}\``,
  `- design-qa.md required: \`${report.routeDecision.designQaRequired}\``,
  '',
  '## Evidence Requirements',
  '',
  ...report.evidenceRequirements.map((item) => `- ${item}`),
  '',
  '## Handoff Requirements',
  '',
  ...report.handoffRequirements.map((item) => `- ${item}`),
  '',
  '## Product Design Bridge',
  '',
  `- Ready for bridge: \`${report.productDesignBridge.readyForBridge}\``,
  `- Plugin version: \`${report.productDesignBridge.pluginCache.version || 'unknown'}\``,
  `- Current session callable assumed: \`${report.productDesignBridge.currentSession.callableAssumed}\``,
  '',
  '## Next Steps',
  '',
  ...report.nextSteps.map((item) => `- ${item}`),
  ''
].join('\n');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const briefOption = readOption(args, '--brief');
if (!briefOption) fail('Missing required --brief path.');

const briefPath = resolveRepoPath(briefOption);
if (!isPathInside(briefPath, root)) fail('--brief must point inside this repo.');
if (!existsSync(briefPath)) fail(`Brief file does not exist: ${briefOption}`);

const taskKind = readOption(args, '--task-kind') || 'prototype';
if (!taskKinds.has(taskKind)) fail(`Unsupported --task-kind: ${taskKind}`);

const interactivity = readOption(args, '--interactivity') || 'full';
if (!interactivityLevels.has(interactivity)) fail(`Unsupported --interactivity: ${interactivity}`);

const outDir = resolveRepoPath(readOption(args, '--out-dir') || defaultOutDir);
if (!isPathInside(outDir, root)) fail('--out-dir must point inside this repo.');

const visualSource = readOption(args, '--visual-source');
const visualSourceInfo = classifyVisualSource(visualSource);
const briefText = readFileSync(briefPath, 'utf8');
const briefSnapshot = extractBriefSnapshot(briefText);
const routeDecision = decideRoute({
  taskKind,
  interactivity,
  visualSourceType: visualSourceInfo.type
});
const evidence = evidenceForRoute({ routeDecision, visualSourceType: visualSourceInfo.type });
const productDesignBridge = auditProductDesignBridge({
  pluginRoot: readOption(args, '--plugin-root'),
  codexHome: readOption(args, '--codex-home')
});

mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, 'product-design-task-brief.json');
const markdownPath = path.join(outDir, 'product-design-task-brief.md');
const report = {
  schema: 'frontend-design-boost-product-design-brief/v1',
  ok: true,
  externalActionsExecuted: false,
  writtenAt: new Date().toISOString(),
  inputs: {
    briefPath: toProjectPath(briefPath),
    taskKind,
    interactivity,
    visualSource: visualSourceInfo.value,
    visualSourceType: visualSourceInfo.type,
    outDir: toProjectPath(outDir)
  },
  briefSnapshot,
  productDesignBridge,
  routeDecision,
  evidenceRequirements: evidence.evidenceRequirements,
  handoffRequirements: evidence.handoffRequirements,
  artifacts: {
    jsonPath: toProjectPath(jsonPath),
    markdownPath: toProjectPath(markdownPath)
  },
  nextSteps: routeDecision.noVisualTargetGate
    ? [
      'Run Product Design ideate if @Product Design is callable, or run flow:frontend-design-boost:image for three local visual directions.',
      'Wait for the user to select a visual target before implementation.',
      'After selection, rerun this preflight with --visual-source pointing to the selected URL, image, or mockup.'
    ]
    : [
      `Use get-context, then ${routeDecision.recommendedPluginSkill} if @Product Design is callable.`,
      `If @Product Design is not callable, use local fallback: ${routeDecision.localFallback}.`,
      routeDecision.designQaRequired
        ? 'Before handoff, write design-qa.md and run desktop/mobile frontend-design-boost screenshot QA.'
        : 'Before handoff, run desktop/mobile frontend-design-boost screenshot QA.'
    ],
  notes: [
    'This command is repo-local and read-only except for writing the requested brief artifacts.',
    'It does not call Product Design, generate images, install dependencies, deploy, or write saved Product Design context.',
    'Treat a cached Product Design plugin as method evidence, not current-session callability.'
  ]
};

writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(markdownPath, renderMarkdown(report), 'utf8');

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
