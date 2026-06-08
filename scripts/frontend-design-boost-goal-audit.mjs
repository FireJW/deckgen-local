#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultJobsPath = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack', 'image-generation-jobs.json');
const repoSkillRoot = path.join(root, 'docs', 'frontend-design-boost', 'skill', 'frontend-design-boost');
const skillRelativeFiles = [
  'SKILL.md',
  path.join('agents', 'openai.yaml'),
  path.join('references', 'companion-skills.md')
];
const requiredInstalledSkillMarkers = [
  'Image-Assisted Frontend Work',
  'gpt-image-2',
  'reference intake',
  'image-generation-jobs.json',
  'asset-selection bridge',
  'imagegen-handoff.json',
  'frontend-design-boost-image-jobs-plan.mjs',
  'frontend-design-boost-image-jobs-run.mjs',
  'frontend-design-boost-image-workflow.mjs',
  'frontend-design-boost-image-acceptance.mjs',
  'frontend-design-boost-image-decision.mjs',
  'frontend-design-boost-image-evidence.mjs',
  'frontend-design-boost-image-implementation-handoff.mjs',
  'frontend-design-boost-imagegen-import.mjs',
  'frontend-design-boost-imagegen-acceptance.mjs',
  'frontend-design-boost-ccswitch-acceptance.mjs',
  'frontend-design-boost-asset-intake.mjs',
  'frontend-design-boost-skill-readiness.mjs',
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
  'docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md',
  'docs/frontend-design-boost/case-library/shadcn-dashboard-block.md'
];
const productDesignCoreSkills = [
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
  'frontend-design-boost-goal-audit [--jobs <path>] [--live-evidence <path>] [--imagegen-acceptance <path>] [--implementation-handoff <path>] [--installed-skill <path>] [--codex-home <path>] [--product-design-plugin-root <path>]',
  '',
  'Audit frontend-design-boost readiness for the gpt-image-2 workflow.',
  'This command is read-only and does not execute image generation commands.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    jobsPath: defaultJobsPath,
    liveEvidencePath: '',
    imagegenAcceptancePath: '',
    implementationHandoffPath: '',
    installedSkillPath: '',
    codexHome: '',
    productDesignPluginRoot: ''
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
    } else if (flag === '--live-evidence') {
      options.liveEvidencePath = value;
    } else if (flag === '--imagegen-acceptance') {
      options.imagegenAcceptancePath = value;
    } else if (flag === '--implementation-handoff') {
      options.implementationHandoffPath = value;
    } else if (flag === '--installed-skill') {
      options.installedSkillPath = value;
    } else if (flag === '--codex-home') {
      options.codexHome = value;
    } else if (flag === '--product-design-plugin-root') {
      options.productDesignPluginRoot = value;
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

const normalizeDisplayPath = (filePath) => String(filePath ?? '').replace(/\\/g, '/');

const isAbsoluteDisplayPath = (filePath) => {
  const normalized = normalizeDisplayPath(filePath);
  return /^[A-Za-z]:\//.test(normalized) || normalized.startsWith('/');
};

const isCodexGeneratedImagesPath = (filePath) =>
  /(^|\/)generated_images(\/|$)/i.test(normalizeDisplayPath(filePath));

const isPathInside = (childPath, parentPath) => {
  const relative = path.relative(path.resolve(parentPath), path.resolve(childPath));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveReportPath = (filePath) => {
  if (!filePath) return '';
  return isAbsoluteDisplayPath(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
};

const readText = (filePath) => readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const safeReadText = (filePath) => {
  try {
    return readText(filePath);
  } catch {
    return '';
  }
};

const safeReadJson = (filePath) => {
  try {
    return JSON.parse(readText(filePath));
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

const resolveInstalledSkillRoot = ({ installedSkillPath, codexHome }) => {
  if (installedSkillPath) return path.resolve(installedSkillPath);

  const homes = candidateCodexHomes(codexHome);
  for (const home of homes) {
    const skillRoot = path.join(home, 'skills', 'frontend-design-boost');
    if (existsSync(skillRoot)) return skillRoot;
  }

  return path.join(homes[0] ?? path.join(os.homedir(), '.codex'), 'skills', 'frontend-design-boost');
};

const isProductDesignRoot = (candidate) => {
  if (!candidate) return false;
  const pluginJson = safeReadJson(path.join(candidate, '.codex-plugin', 'plugin.json'));
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

const resolveProductDesignPluginRoot = ({ productDesignPluginRoot, codexHome }) => {
  if (productDesignPluginRoot) return path.resolve(productDesignPluginRoot);

  for (const home of candidateCodexHomes(codexHome)) {
    const versionRoots = [
      path.join(home, 'plugins', 'cache', 'openai-curated-remote', 'product-design'),
      path.join(home, 'plugins', 'cache', 'openai-curated', 'product-design')
    ];

    for (const versionRoot of versionRoots) {
      if (!existsSync(versionRoot)) continue;
      const versions = readdirSync(versionRoot)
        .filter((entry) => isProductDesignRoot(path.join(versionRoot, entry)))
        .sort(versionSort);
      if (versions.length > 0) return path.join(versionRoot, versions[0]);
    }
  }

  return '';
};

const artifactChecks = [
  {
    id: 'skill-draft',
    label: 'installed skill draft',
    path: 'docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md',
    markers: [
      'Required Flow',
      'Companion Skill Routing',
      'Image-Assisted Frontend Work',
      'gpt-image-2',
      'reference intake',
      'image-generation-jobs.json'
    ]
  },
  {
    id: 'prompt-draft',
    label: 'prompt draft',
    path: 'docs/frontend-design-boost/prompt.md',
    markers: ['Identify the page type', 'Do not use landing-page tropes', 'State the page type', 'React', 'Tailwind']
  },
  {
    id: 'reference-bank',
    label: 'reference bank',
    path: 'docs/frontend-design-boost/reference-bank.md',
    markers: ['Radix', 'WAI-ARIA', 'case library', 'integration']
  },
  {
    id: 'visual-qa-checklist',
    label: 'visual QA checklist',
    path: 'docs/frontend-design-boost/visual-qa-checklist.md',
    markers: ['1440 x 900', '390 x 844', 'focus', 'overflow']
  },
  {
    id: 'companion-skill-routing',
    label: 'companion-skill routing',
    path: 'docs/frontend-design-boost/companion-skills.md',
    markers: ['brainstorming', 'imagegen', 'playwright', 'verification-before-completion']
  },
  {
    id: 'demo-fixture',
    label: 'demo fixture',
    path: 'fixtures/frontend-design-boost/dashboard-demo.html',
    markers: ['Loading billing feed', 'empty', 'failed account data', 'aria-label']
  },
  {
    id: 'prompt-pack-lab',
    label: 'prompt pack lab',
    path: 'scripts/frontend-design-boost-image-assist.mjs',
    markers: ['gpt-image-2', 'reference intake', 'asset-selection.json', 'asset-consumption-demo.html', 'image-generation-jobs.json', 'imagegen-handoff.json']
  },
  {
    id: 'image-job-planner',
    label: 'image job planner',
    path: 'scripts/frontend-design-boost-image-jobs-plan.mjs',
    markers: ['executed: false', 'readyToRun', 'dryRunCommands', 'executableCommands']
  },
  {
    id: 'image-job-runner',
    label: 'image job runner',
    path: 'scripts/frontend-design-boost-image-jobs-run.mjs',
    markers: ['frontend-design-boost-image-job-run/v1', 'applyRequired', 'gpt-image-2', 'spawnSync']
  },
  {
    id: 'image-workflow-orchestrator',
    label: 'image workflow orchestrator',
    path: 'scripts/frontend-design-boost-image-workflow.mjs',
    markers: ['frontend-design-boost-image-workflow/v1', 'frontend-design-boost-image-assist.mjs', 'frontend-design-boost-image-jobs-plan.mjs', 'frontend-design-boost-image-jobs-run.mjs']
  },
  {
    id: 'image-workflow-acceptance',
    label: 'image workflow acceptance',
    path: 'scripts/frontend-design-boost-image-acceptance.mjs',
    markers: ['frontend-design-boost-image-acceptance/v1', 'readyForLiveGeneration', 'promptPackQa', 'installedSkill']
  },
  {
    id: 'image-workflow-decision',
    label: 'image workflow decision',
    path: 'scripts/frontend-design-boost-image-decision.mjs',
    markers: ['frontend-design-boost-image-decision/v1', 'Visual Decision Matrix', 'Design Token Extraction', 'manualDecisionRequired']
  },
  {
    id: 'image-workflow-evidence',
    label: 'image workflow evidence',
    path: 'scripts/frontend-design-boost-image-evidence.mjs',
    markers: ['frontend-design-boost-image-evidence/v1', 'liveGenerationEvidence', 'asset smoke', 'desktop and mobile screenshot QA']
  },
  {
    id: 'image-implementation-handoff',
    label: 'image implementation handoff',
    path: 'scripts/frontend-design-boost-image-implementation-handoff.mjs',
    markers: ['frontend-design-boost-image-implementation-handoff/v1', 'Design Token Extraction', 'Implementation Checklist', 'readyForImplementation']
  },
  {
    id: 'imagegen-import',
    label: 'built-in imagegen import',
    path: 'scripts/frontend-design-boost-imagegen-import.mjs',
    markers: ['frontend-design-boost-imagegen-import/v1', 'CODEX_HOME/generated_images', 'project-local asset paths', 'asset smoke']
  },
  {
    id: 'imagegen-acceptance',
    label: 'built-in imagegen acceptance',
    path: 'scripts/frontend-design-boost-imagegen-acceptance.mjs',
    markers: ['frontend-design-boost-imagegen-acceptance/v1', 'built-in-imagegen', 'asset smoke', 'image evidence', 'implementationHandoff']
  },
  {
    id: 'ccswitch-acceptance',
    label: 'ccswitch acceptance',
    path: 'scripts/frontend-design-boost-ccswitch-acceptance.mjs',
    markers: ['frontend-design-boost-ccswitch-acceptance/v1', 'ccswitch', 'asset smoke', 'image evidence', 'implementationHandoff']
  },
  {
    id: 'asset-intake-report',
    label: 'asset intake report',
    path: 'scripts/frontend-design-boost-asset-intake.mjs',
    markers: ['frontend-design-boost-asset-intake/v1', 'Design Extraction', 'Implementation Handoff', 'Do not treat generated images as implementation truth']
  },
  {
    id: 'installed-skill-readiness',
    label: 'installed skill readiness',
    path: 'scripts/frontend-design-boost-skill-readiness.mjs',
    markers: ['frontend-design-boost-skill-readiness/v1', 'approvalRequired', 'sync:frontend-design-boost-skill', 'explicit approval']
  },
  {
    id: 'product-design-bridge',
    label: 'Product Design plugin bridge',
    path: 'docs/frontend-design-boost/product-design-plugin-bridge.md',
    markers: ['@Product Design', 'get-context', 'ideate', 'No Visual Target, No Build', 'design-qa.md', 'fallback']
  },
  {
    id: 'product-design-bridge-readiness',
    label: 'Product Design bridge readiness',
    path: 'scripts/frontend-design-boost-product-design-readiness.mjs',
    markers: ['frontend-design-boost-product-design-readiness/v1', 'product-design', 'openai-curated-remote', 'callableAssumed']
  },
  {
    id: 'product-design-brief-preflight',
    label: 'Product Design task brief preflight',
    path: 'scripts/frontend-design-boost-product-design-brief.mjs',
    markers: ['frontend-design-boost-product-design-brief/v1', 'No Visual Target, No Build', 'design-qa.md', 'flow:frontend-design-boost:image']
  },
  {
    id: 'product-design-ideation-scaffold',
    label: 'Product Design ideation scaffold',
    path: 'scripts/frontend-design-boost-product-design-ideate.mjs',
    markers: ['frontend-design-boost-product-design-ideate/v1', 'product-design-ideation.md', 'Three Independent Directions', 'noBuildBeforeSelection']
  },
  {
    id: 'product-design-qa-scaffold',
    label: 'Product Design design QA scaffold',
    path: 'scripts/frontend-design-boost-product-design-qa.mjs',
    markers: ['frontend-design-boost-product-design-qa/v1', 'design-qa.md', "finalResult = 'blocked'", 'full-view comparison evidence']
  },
  {
    id: 'product-design-flow-audit',
    label: 'Product Design flow audit scaffold',
    path: 'scripts/frontend-design-boost-product-design-audit.mjs',
    markers: ['frontend-design-boost-product-design-audit/v1', 'product-design-audit.md', "finalResult = 'blocked'", 'Screenshot Evidence']
  }
];

const auditRepoArtifacts = () => artifactChecks.map((check) => {
  const absolutePath = path.join(root, check.path);
  const exists = existsSync(absolutePath);
  const text = exists ? safeReadText(absolutePath) : '';
  const missingMarkers = check.markers.filter((marker) => !text.includes(marker));
  const status = !exists ? 'missing' : missingMarkers.length === 0 ? 'covered' : 'needs-attention';

  return {
    id: check.id,
    label: check.label,
    status,
    path: check.path,
    missingMarkers
  };
});

const auditInstalledSkill = (installedSkillRoot) => {
  const exists = existsSync(installedSkillRoot);
  const compared = [];
  const errors = [];

  for (const relativeFile of skillRelativeFiles) {
    const repoPath = path.join(repoSkillRoot, relativeFile);
    const installedPath = path.join(installedSkillRoot, relativeFile);

    if (!existsSync(repoPath)) {
      errors.push({ file: relativeFile, error: 'missing repo skill file', path: toProjectPath(repoPath) });
      continue;
    }
    if (!existsSync(installedPath)) {
      errors.push({ file: relativeFile, error: 'missing installed skill file', path: toProjectPath(installedPath) });
      compared.push({ file: relativeFile, matches: false });
      continue;
    }

    const matches = readText(repoPath) === readText(installedPath);
    compared.push({ file: relativeFile, matches });
    if (!matches) errors.push({ file: relativeFile, error: 'installed file differs from repo draft' });
  }

  const installedSkillPath = path.join(installedSkillRoot, 'SKILL.md');
  const installedSkill = existsSync(installedSkillPath) ? safeReadText(installedSkillPath) : '';
  for (const marker of requiredInstalledSkillMarkers) {
    if (!installedSkill.includes(marker)) {
      errors.push({ file: 'SKILL.md', error: 'missing required installed skill marker', marker });
    }
  }

  const status = !exists ? 'missing' : errors.length === 0 ? 'current' : 'stale';
  return {
    status,
    path: toProjectPath(installedSkillRoot),
    compared,
    requiredMarkers: requiredInstalledSkillMarkers,
    errors,
    syncCommand: 'npm.cmd run sync:frontend-design-boost-skill -- --apply',
    approvalRequired: status !== 'current'
  };
};

const auditProductDesignBridge = (options) => {
  const pluginRoot = resolveProductDesignPluginRoot(options);
  const pluginJsonPath = pluginRoot ? path.join(pluginRoot, '.codex-plugin', 'plugin.json') : '';
  const pluginJson = pluginJsonPath ? safeReadJson(pluginJsonPath) : null;
  const detected = Boolean(pluginRoot && pluginJson?.name === 'product-design');
  const coreSkills = productDesignCoreSkills.map((skill) => {
    const skillPath = pluginRoot ? path.join(pluginRoot, 'skills', skill, 'SKILL.md') : '';
    return {
      skill,
      path: skillPath ? toProjectPath(skillPath) : '',
      exists: Boolean(skillPath && existsSync(skillPath))
    };
  });
  const missingCoreSkills = coreSkills.filter((item) => !item.exists).map((item) => item.skill);
  const readyForBridge = detected && missingCoreSkills.length === 0;

  return {
    label: 'Product Design plugin bridge',
    status: readyForBridge ? 'ready' : detected ? 'incomplete' : 'missing',
    readyForBridge,
    executed: false,
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
      reason: 'Treat @Product Design as callable only when the current Codex session exposes the plugin or its skills.'
    },
    coreSkills,
    missingCoreSkills,
    recommendedRouting: [
      'Call @Product Design when it is exposed in the current session.',
      'Use get-context before ideate, prototype, url-to-code, image-to-code, audit, or share.',
      'Apply No Visual Target, No Build before new product, redesign, clone, or image-to-code work.',
      'Use frontend-design-boost fallback when @Product Design is cached but not callable.'
    ],
    readinessCommand: 'npm.cmd run readiness:frontend-design-boost:product-design'
  };
};

const auditImageGeneration = (jobsPath) => {
  const resolvedJobsPath = path.resolve(jobsPath);
  if (!existsSync(resolvedJobsPath)) {
    return {
      status: 'missing',
      readyToRun: false,
      jobsPath: toProjectPath(resolvedJobsPath),
      blockedBy: [{ type: 'missing image-generation-jobs.json', path: toProjectPath(resolvedJobsPath) }],
      dryRunCommands: [],
      executableCommands: []
    };
  }

  let jobsManifest;
  try {
    jobsManifest = JSON.parse(readText(resolvedJobsPath));
  } catch (error) {
    return {
      status: 'invalid',
      readyToRun: false,
      jobsPath: toProjectPath(resolvedJobsPath),
      blockedBy: [{ type: 'invalid image-generation-jobs.json', message: error.message }],
      dryRunCommands: [],
      executableCommands: []
    };
  }

  const environmentRequirements = Array.isArray(jobsManifest.environmentRequirements)
    ? jobsManifest.environmentRequirements
    : [];
  const missingEnvironment = environmentRequirements
    .filter((name) => !process.env[name])
    .map((name) => ({ type: 'missing environment variable', name }));
  const jobs = Array.isArray(jobsManifest.jobs) ? jobsManifest.jobs : [];
  const malformedJobs = jobs
    .filter((job) => !job.id || !job.prompt || !job.command || !job.dryRunCommand || !job.outputPath || !job.status)
    .map((job) => ({ type: 'malformed job', id: job.id ?? '', label: job.label ?? '' }));
  const schemaErrors = jobsManifest.schema === 'frontend-design-boost-image-generation-jobs/v1'
    ? []
    : [{ type: 'unsupported schema', schema: jobsManifest.schema ?? 'missing' }];
  const blockedBy = [...schemaErrors, ...missingEnvironment, ...malformedJobs];
  const readyToRun = blockedBy.length === 0 && jobsManifest.executionMode === 'approval-gated';

  return {
    status: readyToRun ? 'ready' : 'blocked',
    readyToRun,
    jobsPath: toProjectPath(resolvedJobsPath),
    schema: jobsManifest.schema ?? '',
    model: jobsManifest.model ?? '',
    transport: jobsManifest.transport ?? '',
    routeRole: jobsManifest.routeRole ?? '',
    defaultRoute: jobsManifest.defaultRoute ?? null,
    executionMode: jobsManifest.executionMode ?? '',
    jobCount: jobs.length,
    jobIds: jobs.map((job) => job.id).filter(Boolean),
    environmentRequirements,
    blockedBy,
    dryRunCommands: jobs.map((job) => job.dryRunCommand).filter(Boolean),
    executableCommands: jobs.map((job) => job.command).filter(Boolean)
  };
};

const auditLiveGeneration = (liveEvidencePath, imageGeneration) => {
  if (!liveEvidencePath) {
    return {
      status: 'not-provided',
      verified: false,
      path: '',
      blockedBy: [{ type: 'missing live evidence report' }]
    };
  }

  const resolvedEvidencePath = path.resolve(liveEvidencePath);
  if (!existsSync(resolvedEvidencePath)) {
    return {
      status: 'missing',
      verified: false,
      path: toProjectPath(resolvedEvidencePath),
      blockedBy: [{ type: 'missing live evidence report' }]
    };
  }

  let evidence;
  try {
    evidence = JSON.parse(readText(resolvedEvidencePath));
  } catch (error) {
    return {
      status: 'invalid',
      verified: false,
      path: toProjectPath(resolvedEvidencePath),
      blockedBy: [{ type: 'invalid live evidence report', message: error.message }]
    };
  }

  const blockedBy = [];
  if (evidence.schema !== 'frontend-design-boost-image-evidence/v1') {
    blockedBy.push({ type: 'unsupported live evidence schema', schema: evidence.schema ?? 'missing' });
  }
  if (evidence.liveGenerationEvidence !== true) {
    blockedBy.push({ type: 'live evidence report is not verified' });
  }
  if (evidence.model !== 'gpt-image-2') {
    blockedBy.push({ type: 'unexpected live evidence model', model: evidence.model ?? 'missing' });
  }
  const allowedTransports = new Set(['ccswitch', 'built-in-imagegen']);
  if (!allowedTransports.has(evidence.transport)) {
    blockedBy.push({ type: 'unexpected live evidence transport', transport: evidence.transport ?? 'missing' });
  }
  if (!evidence.selectedJob?.id) {
    blockedBy.push({ type: 'missing live evidence selected job' });
  }
  if (Array.isArray(imageGeneration.jobIds) && imageGeneration.jobIds.length > 0 && !imageGeneration.jobIds.includes(evidence.selectedJob?.id)) {
    blockedBy.push({ type: 'live evidence job is not in image-generation-jobs.json', job: evidence.selectedJob?.id ?? 'missing' });
  }
  if (evidence.asset?.dimensionsMatch !== true) {
    blockedBy.push({ type: 'live evidence asset dimensions do not match selected job' });
  }
  if (evidence.evidenceMode === 'built-in-imagegen-handoff') {
    if (evidence.builtInHandoff?.valid !== true) {
      blockedBy.push({ type: 'built-in imagegen handoff is not valid' });
    }
    if (evidence.builtInHandoff?.requiresOpenAiApiKey !== false) {
      blockedBy.push({ type: 'built-in imagegen handoff does not prove no-key route' });
    }
  } else if (evidence.runnerReport?.executed !== true) {
    blockedBy.push({ type: 'live evidence runner report did not execute' });
  }

  return {
    status: blockedBy.length === 0 ? 'verified' : 'blocked',
    verified: blockedBy.length === 0,
    path: toProjectPath(resolvedEvidencePath),
    selectedJobId: evidence.selectedJob?.id ?? '',
    model: evidence.model ?? '',
    transport: evidence.transport ?? '',
    assetPath: evidence.asset?.path ?? '',
    blockedBy
  };
};

const auditImagegenAcceptance = (imagegenAcceptancePath, liveEvidencePath, codexHome) => {
  const base = {
    supplied: false,
    valid: false,
    provenanceReady: false,
    status: 'not-provided',
    path: '',
    sourcePath: '',
    evidencePath: '',
    blockedBy: []
  };

  if (!imagegenAcceptancePath) {
    return {
      ...base,
      blockedBy: [{
        type: 'missing imagegen acceptance report',
        reason: 'built-in imagegen provenance requires imagegen-acceptance-report.json with an external CODEX_HOME/generated_images source'
      }]
    };
  }

  const resolvedAcceptancePath = path.resolve(imagegenAcceptancePath);
  if (!existsSync(resolvedAcceptancePath)) {
    return {
      ...base,
      supplied: true,
      status: 'missing',
      path: toProjectPath(resolvedAcceptancePath),
      blockedBy: [{ type: 'missing imagegen acceptance report', path: toProjectPath(resolvedAcceptancePath) }]
    };
  }

  let acceptance;
  try {
    acceptance = JSON.parse(readText(resolvedAcceptancePath));
  } catch (error) {
    return {
      ...base,
      supplied: true,
      status: 'invalid',
      path: toProjectPath(resolvedAcceptancePath),
      blockedBy: [{ type: 'invalid imagegen acceptance report', message: error.message }]
    };
  }

  const selectedImportAsset = Array.isArray(acceptance.importReport?.assets)
    ? acceptance.importReport.assets.find((asset) => asset.assetId === acceptance.assetId) ?? acceptance.importReport.assets[0]
    : null;
  const sourcePath = selectedImportAsset?.sourcePath ?? '';
  const sourceAbsolutePath = resolveReportPath(sourcePath);
  const evidencePath = acceptance.evidencePath ?? acceptance.imageEvidence?.reportPath ?? '';
  const expectedLiveEvidencePath = liveEvidencePath ? toProjectPath(path.resolve(liveEvidencePath)) : '';
  const explicitGeneratedImagesDir = codexHome ? path.join(path.resolve(codexHome), 'generated_images') : '';
  const sourceIsExplicitCodexHome = Boolean(
    sourceAbsolutePath
    && explicitGeneratedImagesDir
    && isPathInside(sourceAbsolutePath, explicitGeneratedImagesDir)
  );
  const sourceIsExternalGeneratedImages = Boolean(
    sourcePath
    && isAbsoluteDisplayPath(sourcePath)
    && isCodexGeneratedImagesPath(sourcePath)
  );
  const blockedBy = [];

  if (acceptance.schema !== 'frontend-design-boost-imagegen-acceptance/v1') {
    blockedBy.push({ type: 'unsupported imagegen acceptance schema', schema: acceptance.schema ?? 'missing' });
  }
  if (acceptance.ok !== true) blockedBy.push({ type: 'imagegen acceptance did not pass' });
  if (acceptance.route !== 'built-in-imagegen') {
    blockedBy.push({ type: 'imagegen acceptance route is not built-in-imagegen', route: acceptance.route ?? 'missing' });
  }
  if (acceptance.model !== 'gpt-image-2') {
    blockedBy.push({ type: 'imagegen acceptance model is not gpt-image-2', model: acceptance.model ?? 'missing' });
  }
  if (acceptance.imageEvidence?.liveGenerationEvidence !== true) {
    blockedBy.push({ type: 'imagegen acceptance does not include verified image evidence' });
  }
  if (!selectedImportAsset) {
    blockedBy.push({ type: 'imagegen acceptance import report has no selected asset' });
  } else {
    if (selectedImportAsset.copied !== true) blockedBy.push({ type: 'imagegen acceptance import did not copy the selected asset' });
    if (selectedImportAsset.dimensionsMatch !== true) blockedBy.push({ type: 'imagegen acceptance source dimensions do not match the selected asset' });
    if (!sourcePath || (!sourceIsExternalGeneratedImages && !sourceIsExplicitCodexHome)) {
      blockedBy.push({
        type: 'imagegen acceptance source is not external CODEX_HOME/generated_images',
        sourcePath: sourcePath || 'missing',
        expected: 'absolute path under CODEX_HOME/generated_images or --codex-home/generated_images'
      });
    }
  }
  if (expectedLiveEvidencePath && normalizeDisplayPath(evidencePath) !== normalizeDisplayPath(expectedLiveEvidencePath)) {
    blockedBy.push({
      type: 'imagegen acceptance evidence path does not match --live-evidence',
      evidencePath,
      liveEvidencePath: expectedLiveEvidencePath
    });
  }

  return {
    supplied: true,
    valid: acceptance.schema === 'frontend-design-boost-imagegen-acceptance/v1',
    provenanceReady: blockedBy.length === 0,
    status: blockedBy.length === 0 ? 'verified' : 'blocked',
    path: toProjectPath(resolvedAcceptancePath),
    assetId: acceptance.assetId ?? '',
    sourcePath,
    evidencePath,
    blockedBy
  };
};

const auditImplementationHandoff = (implementationHandoffPath, liveEvidencePath, imagegenAcceptancePath) => {
  const base = {
    supplied: false,
    valid: false,
    readyForImplementation: false,
    status: 'not-provided',
    path: '',
    selectedAssetId: '',
    evidencePath: '',
    acceptancePath: '',
    blockedBy: []
  };

  if (!implementationHandoffPath) {
    return {
      ...base,
      blockedBy: [{
        type: 'missing image implementation handoff',
        reason: 'live image evidence must be connected to an implementation handoff before goal completion'
      }]
    };
  }

  const resolvedHandoffPath = path.resolve(implementationHandoffPath);
  if (!existsSync(resolvedHandoffPath)) {
    return {
      ...base,
      supplied: true,
      status: 'missing',
      path: toProjectPath(resolvedHandoffPath),
      blockedBy: [{ type: 'missing image implementation handoff', path: toProjectPath(resolvedHandoffPath) }]
    };
  }

  let handoff;
  try {
    handoff = JSON.parse(readText(resolvedHandoffPath));
  } catch (error) {
    return {
      ...base,
      supplied: true,
      status: 'invalid',
      path: toProjectPath(resolvedHandoffPath),
      blockedBy: [{ type: 'invalid image implementation handoff', message: error.message }]
    };
  }

  const evidencePath = handoff.evidencePath ?? handoff.routeEvidence?.evidencePath ?? '';
  const acceptancePath = handoff.acceptancePath ?? handoff.routeEvidence?.acceptancePath ?? '';
  const expectedLiveEvidencePath = liveEvidencePath ? toProjectPath(path.resolve(liveEvidencePath)) : '';
  const expectedAcceptancePath = imagegenAcceptancePath ? toProjectPath(path.resolve(imagegenAcceptancePath)) : '';
  const blockedBy = [];

  if (handoff.schema !== 'frontend-design-boost-image-implementation-handoff/v1') {
    blockedBy.push({ type: 'unsupported image implementation handoff schema', schema: handoff.schema ?? 'missing' });
  }
  if (handoff.readyForImplementation !== true) blockedBy.push({ type: 'image implementation handoff is not ready' });
  if (!handoff.selectedAsset?.id) blockedBy.push({ type: 'image implementation handoff has no selected asset' });
  if (handoff.routeEvidence?.liveGenerationEvidence !== true) {
    blockedBy.push({ type: 'image implementation handoff does not include live generation evidence' });
  }
  if (handoff.routeEvidence?.model !== 'gpt-image-2') {
    blockedBy.push({ type: 'image implementation handoff model is not gpt-image-2', model: handoff.routeEvidence?.model ?? 'missing' });
  }
  if (handoff.routeEvidence?.transport === 'built-in-imagegen' && handoff.routeEvidence?.provenanceReady !== true) {
    blockedBy.push({ type: 'image implementation handoff built-in provenance is not ready' });
  }
  if (!Array.isArray(handoff.implementationChecklist) || handoff.implementationChecklist.length < 1) {
    blockedBy.push({ type: 'image implementation handoff has no implementation checklist' });
  }
  if (!Array.isArray(handoff.doNotCopy) || handoff.doNotCopy.length < 1) {
    blockedBy.push({ type: 'image implementation handoff has no do-not-copy rules' });
  }
  if (expectedLiveEvidencePath && normalizeDisplayPath(evidencePath) !== normalizeDisplayPath(expectedLiveEvidencePath)) {
    blockedBy.push({
      type: 'image implementation handoff evidence path does not match --live-evidence',
      evidencePath,
      liveEvidencePath: expectedLiveEvidencePath
    });
  }
  if (expectedAcceptancePath && normalizeDisplayPath(acceptancePath) !== normalizeDisplayPath(expectedAcceptancePath)) {
    blockedBy.push({
      type: 'image implementation handoff acceptance path does not match --imagegen-acceptance',
      acceptancePath,
      imagegenAcceptancePath: expectedAcceptancePath
    });
  }

  return {
    supplied: true,
    valid: handoff.schema === 'frontend-design-boost-image-implementation-handoff/v1',
    readyForImplementation: blockedBy.length === 0,
    status: blockedBy.length === 0 ? 'verified' : 'blocked',
    path: toProjectPath(resolvedHandoffPath),
    selectedAssetId: handoff.selectedAsset?.id ?? '',
    evidencePath,
    acceptancePath,
    blockedBy
  };
};

const options = parseArgs();
const coverage = auditRepoArtifacts();
const repoReady = coverage.every((item) => item.status === 'covered');
const installedSkill = auditInstalledSkill(resolveInstalledSkillRoot(options));
const productDesignBridge = auditProductDesignBridge(options);
const imageGeneration = auditImageGeneration(options.jobsPath);
const liveGeneration = auditLiveGeneration(options.liveEvidencePath, imageGeneration);
const imagegenAcceptance = auditImagegenAcceptance(options.imagegenAcceptancePath, options.liveEvidencePath, options.codexHome);
const implementationHandoff = auditImplementationHandoff(
  options.implementationHandoffPath,
  options.liveEvidencePath,
  options.imagegenAcceptancePath
);
const liveGenerationVerified = liveGeneration.verified === true;
const defaultRouteSatisfied = liveGenerationVerified && liveGeneration.transport === 'built-in-imagegen';
const cliFallbackRequired = liveGenerationVerified && liveGeneration.transport !== 'built-in-imagegen';
const routeReady = defaultRouteSatisfied || (cliFallbackRequired && imageGeneration.readyToRun === true);
const builtInProvenanceRequired = liveGenerationVerified && liveGeneration.transport === 'built-in-imagegen';
const builtInProvenanceReady = !builtInProvenanceRequired || imagegenAcceptance.provenanceReady === true;
const implementationHandoffRequired = liveGenerationVerified;
const implementationHandoffReady = !implementationHandoffRequired || implementationHandoff.readyForImplementation === true;
const routeReadiness = {
  defaultRoute: 'built-in-imagegen',
  defaultRouteSatisfied,
  cliFallbackRequired,
  cliFallbackReady: imageGeneration.readyToRun === true,
  cliFallbackStatus: imageGeneration.status,
  cliFallbackBlockers: imageGeneration.blockedBy ?? []
};

const blockedBy = [];
if (!repoReady) {
  blockedBy.push({
    id: 'repo-artifacts',
    reason: 'repo frontend-design-boost artifacts are missing required markers'
  });
}
if (installedSkill.status !== 'current') {
  blockedBy.push({
    id: 'installed-skill-sync',
    reason: 'installed skill sync requires explicit approval because it writes outside this repo',
    command: installedSkill.syncCommand
  });
}
const shouldPromoteImageGenerationBlockers = imageGeneration.routeRole !== 'cli-fallback' || cliFallbackRequired;
if (shouldPromoteImageGenerationBlockers) {
  for (const blocker of imageGeneration.blockedBy ?? []) {
    blockedBy.push({
      id: 'image-generation-readiness',
      reason: `${blocker.type}${blocker.name ? `: ${blocker.name}` : ''}`
    });
  }
}
if (!liveGenerationVerified) {
  blockedBy.push({
    id: 'live-gpt-image-generation',
    reason: 'live gpt-image-2 generation evidence has not been verified by this read-only audit',
    command: 'Review image-generation-jobs.json, run the dry-run command, then execute only the approved selected image command.'
  });
}
if (builtInProvenanceRequired && !builtInProvenanceReady) {
  blockedBy.push({
    id: 'built-in-imagegen-provenance',
    reason: 'built-in imagegen provenance requires imagegen-acceptance-report.json with an external CODEX_HOME/generated_images source',
    command: 'npm.cmd run acceptance:frontend-design-boost:imagegen-assets -- --handoff <imagegen-handoff.json> --asset-id <asset-id> --source <CODEX_HOME/generated_images/*.png>'
  });
}
if (implementationHandoffRequired && !implementationHandoffReady) {
  blockedBy.push({
    id: 'image-implementation-handoff',
    reason: 'image implementation handoff is required after live gpt-image-2 evidence before goal completion',
    command: 'npm.cmd run handoff:frontend-design-boost:image -- --decision <image-decision-report.json> --evidence <image-evidence-report.json> --acceptance <imagegen-acceptance-report.json>'
  });
}

const report = {
  schema: 'frontend-design-boost-goal-audit/v1',
  ok: repoReady,
  executed: false,
  repoRoot: root,
  repoReady,
  goalComplete: repoReady && installedSkill.status === 'current' && routeReady && liveGenerationVerified && builtInProvenanceReady && implementationHandoffReady,
  coverage,
  installedSkill,
  productDesignBridge,
  imageGeneration,
  liveGeneration,
  imagegenAcceptance,
  implementationHandoff,
  routeReadiness,
  blockedBy,
  nextSteps: [
    'Run npm.cmd run qa:frontend-design-boost for the HTML fixture QA loop.',
    'Run npm.cmd run lab:frontend-design-boost:image to refresh prompt-pack artifacts.',
    'Use imagegen-handoff.json for the default built-in imagegen route.',
    'Run npm.cmd run import:frontend-design-boost:imagegen-assets after built-in generation to copy selected outputs into project-local asset paths.',
    'Run npm.cmd run acceptance:frontend-design-boost:imagegen-assets to chain import, asset smoke, and image evidence for a selected built-in output.',
    'Run npm.cmd run acceptance:frontend-design-boost:ccswitch-assets after an approved ccswitch live run to chain asset smoke, image evidence, asset intake, image decision, and implementation handoff.',
    'Run npm.cmd run brief:frontend-design-boost:product-design before prototype-like frontend work to create a Product Design task brief preflight.',
    'Run npm.cmd run ideate:frontend-design-boost:product-design when Product Design ideation is required but only the local fallback is available.',
    'Run npm.cmd run design-qa:frontend-design-boost:product-design when Product Design design QA is required but only the local fallback is available.',
    'Run npm.cmd run audit:frontend-design-boost:product-design when Product Design flow audit is required but only the local fallback is available.',
    'Pass --imagegen-acceptance <imagegen-acceptance-report.json> to audit built-in imagegen provenance before claiming the goal complete.',
    'Pass --implementation-handoff <image-implementation-handoff-report.json> so goal completion depends on implementation-ready design extraction and do-not-copy gates.',
    'Run npm.cmd run plan:frontend-design-boost:image-jobs -- --jobs <image-generation-jobs.json> before any CLI fallback image call.',
    'Run npm.cmd run evidence:frontend-design-boost:image after a live selected job has produced a project-local PNG.',
    'Apply installed skill sync only after explicit approval.',
    'Execute live gpt-image-2 jobs only after explicit approval and environment verification.'
  ],
  commandArtifacts: {
    fixtureQa: 'npm.cmd run qa:frontend-design-boost',
    imagePromptPack: 'npm.cmd run lab:frontend-design-boost:image',
    imageJobPlan: 'npm.cmd run plan:frontend-design-boost:image-jobs',
    imagegenImport: 'npm.cmd run import:frontend-design-boost:imagegen-assets',
    imagegenAcceptance: 'npm.cmd run acceptance:frontend-design-boost:imagegen-assets',
    ccswitchAcceptance: 'npm.cmd run acceptance:frontend-design-boost:ccswitch-assets',
    imageImplementationHandoff: 'npm.cmd run handoff:frontend-design-boost:image',
    imageEvidence: 'npm.cmd run evidence:frontend-design-boost:image',
    productDesignBridgeReadiness: 'npm.cmd run readiness:frontend-design-boost:product-design',
    productDesignTaskBrief: 'npm.cmd run brief:frontend-design-boost:product-design',
    productDesignIdeation: 'npm.cmd run ideate:frontend-design-boost:product-design',
    productDesignDesignQa: 'npm.cmd run design-qa:frontend-design-boost:product-design',
    productDesignFlowAudit: 'npm.cmd run audit:frontend-design-boost:product-design',
    installedSkillDrift: 'npm.cmd run check:frontend-design-boost-skill',
    installedSkillSync: installedSkill.syncCommand
  },
  generatedAt: new Date().toISOString()
};

if (existsSync(options.jobsPath)) {
  try {
    report.jobsUpdatedAt = statSync(path.resolve(options.jobsPath)).mtime.toISOString();
  } catch {
    report.jobsUpdatedAt = '';
  }
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
