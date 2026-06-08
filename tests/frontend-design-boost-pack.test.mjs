import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const readText = (relativePath) => readFileSync(path.join(root, relativePath), 'utf8');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const makeChunk = (type, data) => {
  const chunk = Buffer.alloc(12 + data.length);
  const name = Buffer.from(type, 'ascii');
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(0, 8 + data.length);
  return chunk;
};

const makeVisiblePng = (width, height) => {
  const rowStride = width * 4 + 1;
  const raw = Buffer.alloc(rowStride * height);
  const accentWidth = Math.max(1, Math.floor(width / 5));
  const accentHeight = Math.max(1, Math.floor(height / 5));

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * rowStride;
    raw[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      const isAccent = x < accentWidth && y < accentHeight;
      const pixelOffset = rowOffset + 1 + x * 4;
      raw[pixelOffset] = isAccent ? 15 : 255;
      raw[pixelOffset + 1] = isAccent ? 118 : 255;
      raw[pixelOffset + 2] = isAccent ? 110 : 255;
      raw[pixelOffset + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    pngSignature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
};

const parseSize = (size) => {
  const match = String(size).match(/^(\d+)x(\d+)$/);
  assert.ok(match, `Expected WIDTHxHEIGHT size, got ${size}`);
  return { width: Number(match[1]), height: Number(match[2]) };
};

test('frontend design boost pack exposes a standalone fixture QA command', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const visualChecklist = readText('docs/frontend-design-boost/visual-qa-checklist.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const qaScript = readText('scripts/frontend-design-boost-fixture-qa.mjs');

  assert.equal(
    packageJson.scripts?.['qa:frontend-design-boost'],
    'node scripts/frontend-design-boost-fixture-qa.mjs'
  );
  assert.equal(
    packageJson.scripts?.['check:frontend-design-boost-skill'],
    'node scripts/frontend-design-boost-skill-drift.mjs'
  );
  assert.equal(existsSync(path.join(root, 'scripts/frontend-design-boost-fixture-qa.mjs')), true);
  assert.equal(existsSync(path.join(root, 'scripts/frontend-design-boost-skill-drift.mjs')), true);
  assert.match(visualChecklist, /npm\.cmd run qa:frontend-design-boost/);
  assert.match(referenceBank, /qa:frontend-design-boost/);
  assert.match(referenceBank, /check:frontend-design-boost-skill/);
  assert.match(qaScript, /defaultCodexNodeModuleDirs/);
  assert.match(qaScript, /detectBrowserExecutable/);
  assert.match(qaScript, /--module-dir/);
  assert.match(qaScript, /--browser-executable/);
  assert.match(qaScript, /minTargetSize/);
  assert.match(qaScript, /undersizedTargets/);

  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  assert.match(driftScript, /CODEX_HOME/);
  assert.match(driftScript, /AppData/);
  assert.match(driftScript, /frontend-design-boost/);
  assert.match(driftScript, /requiredSkillMarkers/);
  assert.match(driftScript, /frontend-design-boost-goal-audit\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-acceptance\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-evidence\.mjs/);
  assert.match(driftScript, /frontend-design-boost-imagegen-import\.mjs/);
  assert.match(driftScript, /frontend-design-boost-imagegen-acceptance\.mjs/);
  assert.match(driftScript, /frontend-design-boost-ccswitch-acceptance\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-jobs-run\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-workflow\.mjs/);
  assert.match(driftScript, /flow:frontend-design-boost:image/);
  assert.match(driftScript, /acceptance:frontend-design-boost:image/);
  assert.match(driftScript, /acceptance:frontend-design-boost:imagegen-assets/);
  assert.match(driftScript, /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(driftScript, /frontend-design-boost-asset-intake\.mjs/);
  assert.match(driftScript, /intake:frontend-design-boost:assets/);
  assert.match(driftScript, /frontend-design-boost-skill-readiness\.mjs/);
  assert.match(driftScript, /readiness:frontend-design-boost-skill/);
  assert.match(driftScript, /case-library\/ocmacro-trump-dashboard\.md/);
});

test('frontend design boost exposes a safe installed-skill sync helper', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const syncScriptPath = path.join(root, 'scripts/frontend-design-boost-skill-sync.mjs');

  assert.equal(
    packageJson.scripts?.['sync:frontend-design-boost-skill'],
    'node scripts/frontend-design-boost-skill-sync.mjs'
  );
  assert.equal(existsSync(syncScriptPath), true);

  const syncScript = readText('scripts/frontend-design-boost-skill-sync.mjs');
  assert.match(syncScript, /--apply/);
  assert.match(syncScript, /dry-run/i);
  assert.match(syncScript, /asset-selection bridge/);
  assert.match(syncScript, /installed skill/i);

  const dryRun = JSON.parse(execFileSync(
    process.execPath,
    [
      syncScriptPath,
      '--installed-skill',
      path.join(root, '.tmp/frontend-design-boost/test-installed-skill')
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));
  assert.equal(dryRun.dryRun, true);
  assert.equal(dryRun.applied, false);
  assert.equal(dryRun.filePlan.length, 3);
  assert.match(JSON.stringify(dryRun), /asset-selection bridge/);
});

test('frontend design boost exposes an installed-skill readiness report', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readinessScriptPath = path.join(root, 'scripts/frontend-design-boost-skill-readiness.mjs');
  const installedSkillPath = path.join(root, '.tmp/frontend-design-boost/test-readiness-installed-skill');

  assert.equal(
    packageJson.scripts?.['readiness:frontend-design-boost-skill'],
    'node scripts/frontend-design-boost-skill-readiness.mjs'
  );
  assert.equal(existsSync(readinessScriptPath), true);

  mkdirSync(installedSkillPath, { recursive: true });
  writeFileSync(path.join(installedSkillPath, 'SKILL.md'), '# stale installed skill\n', 'utf8');

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      readinessScriptPath,
      '--installed-skill',
      installedSkillPath
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-skill-readiness/v1');
  assert.equal(report.executed, false);
  assert.equal(report.ready, false);
  assert.equal(report.approvalRequired, true);
  assert.equal(report.syncCommand, 'npm.cmd run sync:frontend-design-boost-skill -- --apply');
  assert.match(reportText, /installed skill is stale/i);
  assert.match(reportText, /flow:frontend-design-boost:image/);
  assert.match(reportText, /acceptance:frontend-design-boost:image/);
  assert.match(reportText, /decision:frontend-design-boost:image/);
  assert.match(reportText, /evidence:frontend-design-boost:image/);
  assert.match(reportText, /import:frontend-design-boost:imagegen-assets/);
  assert.match(reportText, /acceptance:frontend-design-boost:imagegen-assets/);
  assert.match(reportText, /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(reportText, /intake:frontend-design-boost:assets/);
  assert.match(reportText, /frontend-design-boost-image-acceptance\.mjs/);
  assert.match(reportText, /frontend-design-boost-image-decision\.mjs/);
  assert.match(reportText, /frontend-design-boost-image-evidence\.mjs/);
  assert.match(reportText, /frontend-design-boost-imagegen-import\.mjs/);
  assert.match(reportText, /frontend-design-boost-imagegen-acceptance\.mjs/);
  assert.match(reportText, /frontend-design-boost-ccswitch-acceptance\.mjs/);
  assert.match(reportText, /frontend-design-boost-asset-intake\.mjs/);
  assert.match(reportText, /explicit approval/i);
});

test('frontend design boost exposes an asset smoke gate for generated images', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const smokeScriptPath = path.join(root, 'scripts/frontend-design-boost-asset-smoke.mjs');

  assert.equal(
    packageJson.scripts?.['smoke:frontend-design-boost:assets'],
    'node scripts/frontend-design-boost-asset-smoke.mjs'
  );
  assert.equal(existsSync(smokeScriptPath), true);

  const packOutDir = path.join(root, '.tmp/frontend-design-boost/test-image-asset-smoke-pack');
  execFileSync(process.execPath, [
    path.join(root, 'scripts/frontend-design-boost-image-assist.mjs'),
    '--out-dir',
    packOutDir
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const selectionPath = path.join(packOutDir, 'asset-selection.json');
  const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
  for (const target of selection.implementationTargets) {
    const { width, height } = parseSize(target.size);
    const assetPath = path.join(packOutDir, target.projectPath);
    mkdirSync(path.dirname(assetPath), { recursive: true });
    writeFileSync(assetPath, makeVisiblePng(width, height));
  }

  const smokeReport = JSON.parse(execFileSync(process.execPath, [
    smokeScriptPath,
    '--selection',
    selectionPath
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(smokeReport.ok, true);
  assert.equal(smokeReport.assetCount, 3);
  assert.equal(smokeReport.assets.length, 3);
  assert.match(JSON.stringify(smokeReport), /asset-selection bridge/);
  assert.match(JSON.stringify(smokeReport), /image\/png/);
});

test('frontend design boost asset smoke accepts repo-root live evidence paths', () => {
  const smokeScriptPath = path.join(root, 'scripts/frontend-design-boost-asset-smoke.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-asset-smoke-root-path');
  const assetPath = path.join(outDir, 'repo-root-assets/live-dashboard.png');
  const selectionPath = path.join(outDir, 'asset-selection.json');
  const size = '1536x1024';
  const { width, height } = parseSize(size);
  const rootRelativeAssetPath = path.relative(root, assetPath).split(path.sep).join('/');

  mkdirSync(path.dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, makeVisiblePng(width, height));
  writeFileSync(selectionPath, `${JSON.stringify({
    schema: 'frontend-design-boost-asset-selection/v1',
    implementationTargets: [
      {
        role: 'reference-image',
        assetId: 'live-dashboard',
        outputPath: rootRelativeAssetPath,
        projectPath: rootRelativeAssetPath,
        size,
        status: 'available'
      }
    ]
  }, null, 2)}\n`, 'utf8');

  const smokeReport = JSON.parse(execFileSync(process.execPath, [
    smokeScriptPath,
    '--selection',
    selectionPath,
    '--asset-id',
    'live-dashboard'
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(smokeReport.ok, true);
  assert.equal(smokeReport.assetCount, 1);
  assert.equal(smokeReport.assets[0].assetPath, rootRelativeAssetPath);
  assert.ok(smokeReport.assets[0].pathResolution.some((candidate) => candidate === rootRelativeAssetPath));
});

test('frontend design boost exposes an asset intake report after image generation', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const intakeScriptPath = path.join(root, 'scripts/frontend-design-boost-asset-intake.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-asset-intake');

  assert.equal(
    packageJson.scripts?.['intake:frontend-design-boost:assets'],
    'node scripts/frontend-design-boost-asset-intake.mjs'
  );
  assert.equal(existsSync(intakeScriptPath), true);

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'generated-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const manifestPath = path.join(outDir, 'image-prompts.json');
  const selectionPath = path.join(outDir, 'asset-selection.json');
  const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
  const firstTarget = selection.implementationTargets[0];
  const { width, height } = parseSize(firstTarget.size);
  const firstAssetPath = path.join(root, firstTarget.outputPath);
  mkdirSync(path.dirname(firstAssetPath), { recursive: true });
  writeFileSync(firstAssetPath, makeVisiblePng(width, height));

  const report = JSON.parse(execFileSync(process.execPath, [
    intakeScriptPath,
    '--manifest',
    manifestPath,
    '--selection',
    selectionPath,
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-asset-intake/v1');
  assert.equal(report.executed, false);
  assert.equal(report.assetCount, selection.implementationTargets.length);
  assert.equal(report.availableCount, 1);
  assert.equal(report.pendingCount, selection.implementationTargets.length - 1);
  assert.equal(report.assets[0].status, 'available');
  assert.deepEqual(report.assets[0].dimensions, { width, height });
  assert.equal(existsSync(path.join(root, report.reportPath)), true);
  assert.equal(existsSync(path.join(root, report.markdownPath)), true);
  assert.match(reportText, /Design Extraction/);
  assert.match(reportText, /Implementation Handoff/);
  assert.match(reportText, /do not treat generated images as implementation truth/i);

  const markdown = readFileSync(path.join(root, report.markdownPath), 'utf8');
  assert.match(markdown, /# Frontend Design Boost Asset Intake/);
  assert.match(markdown, /Pending Assets/);
  assert.match(markdown, /Design Extraction/);
  assert.match(markdown, new RegExp(firstTarget.id));
});

test('frontend design boost exposes an image decision report for generated references', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const intakeScriptPath = path.join(root, 'scripts/frontend-design-boost-asset-intake.mjs');
  const decisionScriptPath = path.join(root, 'scripts/frontend-design-boost-image-decision.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-decision');

  assert.equal(
    packageJson.scripts?.['decision:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-decision.mjs'
  );
  assert.equal(existsSync(decisionScriptPath), true);

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'generated-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const selectionPath = path.join(outDir, 'asset-selection.json');
  const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
  const firstTarget = selection.implementationTargets[0];
  const { width, height } = parseSize(firstTarget.size);
  const firstAssetPath = path.join(root, firstTarget.outputPath);
  mkdirSync(path.dirname(firstAssetPath), { recursive: true });
  writeFileSync(firstAssetPath, makeVisiblePng(width, height));

  const intake = JSON.parse(execFileSync(process.execPath, [
    intakeScriptPath,
    '--manifest',
    path.join(outDir, 'image-prompts.json'),
    '--selection',
    selectionPath,
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const decision = JSON.parse(execFileSync(process.execPath, [
    decisionScriptPath,
    '--intake',
    path.join(root, intake.reportPath),
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const decisionText = JSON.stringify(decision);
  assert.equal(decision.schema, 'frontend-design-boost-image-decision/v1');
  assert.equal(decision.executed, false);
  assert.equal(decision.assetCount, selection.implementationTargets.length);
  assert.equal(decision.availableCount, 1);
  assert.equal(decision.deferredCount, selection.implementationTargets.length - 1);
  assert.equal(decision.manualDecisionRequired, true);
  assert.ok(decision.decisionMatrix.some((item) => item.recommendation === 'candidate-for-acceptance'));
  assert.ok(decision.decisionMatrix.some((item) => item.recommendation === 'defer-until-generated'));
  assert.match(decisionText, /Visual Decision Matrix/);
  assert.match(decisionText, /Design Token Extraction/);
  assert.match(decisionText, /desktop and mobile screenshot QA/i);
  assert.match(decisionText, /do not copy generated UI text/i);
  assert.equal(existsSync(path.join(root, decision.reportPath)), true);
  assert.equal(existsSync(path.join(root, decision.markdownPath)), true);

  const markdown = readFileSync(path.join(root, decision.markdownPath), 'utf8');
  assert.match(markdown, /# Frontend Design Boost Image Decision Report/);
  assert.match(markdown, /Acceptance Criteria/);
  assert.match(markdown, /Rejected or Deferred/);
});

test('frontend design boost records live gpt-image evidence before UI implementation', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const evidenceScriptPath = path.join(root, 'scripts/frontend-design-boost-image-evidence.mjs');
  const auditScriptPath = path.join(root, 'scripts/frontend-design-boost-goal-audit.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-evidence');

  assert.equal(
    packageJson.scripts?.['evidence:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-evidence.mjs'
  );
  assert.equal(existsSync(evidenceScriptPath), true);

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'generated-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const jobsPath = path.join(outDir, 'image-generation-jobs.json');
  const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
  const selectedJob = jobs.jobs[0];
  const { width, height } = parseSize(selectedJob.size);
  const assetPath = path.join(root, selectedJob.outputPath);
  mkdirSync(path.dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, makeVisiblePng(width, height));

  const runnerReportPath = path.join(outDir, 'runner-report.json');
  writeFileSync(runnerReportPath, `${JSON.stringify({
    schema: 'frontend-design-boost-image-job-run/v1',
    ok: true,
    executed: true,
    applyRequested: true,
    applyRequired: false,
    mode: 'real-generation',
    jobsPath: path.relative(root, jobsPath).split(path.sep).join('/'),
    model: 'gpt-image-2',
    transport: 'ccswitch',
    selectedJob: {
      id: selectedJob.id,
      label: selectedJob.label,
      outputPath: selectedJob.outputPath
    },
    exitCode: 0,
    stdout: assetPath
  }, null, 2)}\n`, 'utf8');

  const evidence = JSON.parse(execFileSync(process.execPath, [
    evidenceScriptPath,
    '--jobs',
    jobsPath,
    '--job',
    selectedJob.id,
    '--asset',
    assetPath,
    '--runner-report',
    runnerReportPath,
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const evidenceText = JSON.stringify(evidence);
  assert.equal(evidence.schema, 'frontend-design-boost-image-evidence/v1');
  assert.equal(evidence.ok, true);
  assert.equal(evidence.executed, false);
  assert.equal(evidence.liveGenerationEvidence, true);
  assert.equal(evidence.selectedJob.id, selectedJob.id);
  assert.equal(evidence.model, 'gpt-image-2');
  assert.equal(evidence.transport, 'ccswitch');
  assert.deepEqual(evidence.asset.dimensions, { width, height });
  assert.equal(evidence.asset.dimensionsMatch, true);
  assert.equal(evidence.runnerReport.executed, true);
  assert.match(evidenceText, /asset smoke/i);
  assert.match(evidenceText, /image decision/i);
  assert.match(evidenceText, /desktop and mobile screenshot QA/i);
  assert.equal(existsSync(path.join(root, evidence.reportPath)), true);
  assert.equal(existsSync(path.join(root, evidence.markdownPath)), true);

  const markdown = readFileSync(path.join(root, evidence.markdownPath), 'utf8');
  assert.match(markdown, /# Frontend Design Boost Image Evidence/);
  assert.match(markdown, /gpt-image-2/);
  assert.match(markdown, /ccswitch/);
  assert.match(markdown, /desktop and mobile screenshot QA/i);

  const audit = JSON.parse(execFileSync(process.execPath, [
    auditScriptPath,
    '--jobs',
    jobsPath,
    '--live-evidence',
    path.join(root, evidence.reportPath),
    '--installed-skill',
    path.join(outDir, 'installed-skill')
  ], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENAI_API_KEY: ''
    }
  }));

  assert.equal(audit.liveGeneration.verified, true);
  assert.doesNotMatch(JSON.stringify(audit.blockedBy), /live-gpt-image-generation/);
});

test('frontend design boost ccswitch acceptance chains evidence and implementation handoff', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const syncScriptPath = path.join(root, 'scripts/frontend-design-boost-skill-sync.mjs');
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const acceptanceScriptPath = path.join(root, 'scripts/frontend-design-boost-ccswitch-acceptance.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-ccswitch-acceptance');
  const currentInstalledSkillPath = path.join(outDir, 'installed-skill');

  assert.equal(
    packageJson.scripts?.['acceptance:frontend-design-boost:ccswitch-assets'],
    'node scripts/frontend-design-boost-ccswitch-acceptance.mjs'
  );
  assert.equal(existsSync(acceptanceScriptPath), true);

  execFileSync(process.execPath, [
    syncScriptPath,
    '--installed-skill',
    currentInstalledSkillPath,
    '--apply'
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'generated-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const jobsPath = path.join(outDir, 'image-generation-jobs.json');
  const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
  const selectedJob = jobs.jobs[0];
  const { width, height } = parseSize(selectedJob.size);
  const assetPath = path.join(root, selectedJob.outputPath);
  mkdirSync(path.dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, makeVisiblePng(width, height));

  const runnerReportPath = path.join(outDir, 'runner-report.json');
  writeFileSync(runnerReportPath, `${JSON.stringify({
    schema: 'frontend-design-boost-image-job-run/v1',
    ok: true,
    executed: true,
    applyRequested: true,
    applyRequired: false,
    mode: 'real-generation',
    jobsPath: path.relative(root, jobsPath).split(path.sep).join('/'),
    model: 'gpt-image-2',
    transport: 'ccswitch',
    selectedJob: {
      id: selectedJob.id,
      label: selectedJob.label,
      outputPath: selectedJob.outputPath
    },
    exitCode: 0,
    stdout: assetPath
  }, null, 2)}\n`, 'utf8');

  const report = JSON.parse(execFileSync(process.execPath, [
    acceptanceScriptPath,
    '--jobs',
    jobsPath,
    '--job',
    selectedJob.id,
    '--asset',
    assetPath,
    '--runner-report',
    runnerReportPath,
    '--out-dir',
    outDir,
    '--installed-skill',
    currentInstalledSkillPath
  ], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENAI_API_KEY: 'test-key'
    }
  }));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-ccswitch-acceptance/v1');
  assert.equal(report.ok, true);
  assert.equal(report.executed, false);
  assert.equal(report.route, 'ccswitch');
  assert.equal(report.assetId, selectedJob.id);
  assert.equal(report.assetSmoke.ok, true);
  assert.equal(report.imageEvidence.liveGenerationEvidence, true);
  assert.equal(report.assetIntake.schema, 'frontend-design-boost-asset-intake/v1');
  assert.equal(report.assetDecision.schema, 'frontend-design-boost-image-decision/v1');
  assert.equal(report.implementationHandoff.schema, 'frontend-design-boost-image-implementation-handoff/v1');
  assert.equal(report.implementationHandoff.readyForImplementation, true);
  assert.equal(report.implementationHandoff.routeEvidence.transport, 'ccswitch');
  assert.equal(report.implementationHandoff.routeEvidence.acceptanceSupplied, false);
  assert.equal(report.goalAudit.schema, 'frontend-design-boost-goal-audit/v1');
  assert.equal(report.goalAudit.liveGeneration.verified, true);
  assert.equal(report.goalAudit.imagegenAcceptance.supplied, false);
  assert.equal(report.goalAudit.implementationHandoff.readyForImplementation, true);
  assert.equal(
    report.goalAudit.commandArtifacts.ccswitchAcceptance,
    'npm.cmd run acceptance:frontend-design-boost:ccswitch-assets'
  );
  assert.match(JSON.stringify(report.goalAudit.nextSteps), /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(reportText, /ccswitch-acceptance-report\.json/);
  assert.match(reportText, /asset-smoke-report\.json/);
  assert.match(reportText, /Design Token Extraction/);
  assert.match(reportText, /Implementation Checklist/);
  assert.equal(existsSync(path.join(root, report.reportPath)), true);
  assert.equal(existsSync(path.join(root, report.markdownPath)), true);
  assert.equal(existsSync(path.join(root, report.assetSmokePath)), true);
  assert.equal(existsSync(path.join(root, report.implementationHandoffPath)), true);
  assert.equal(existsSync(path.join(root, report.goalAuditPath)), true);

  const markdown = readFileSync(path.join(root, report.markdownPath), 'utf8');
  assert.match(markdown, /Frontend Design Boost CC Switch Acceptance/);
  assert.match(markdown, /Asset smoke: pass/);
  assert.match(markdown, /Implementation handoff: pass/);
});

test('frontend design boost records built-in imagegen handoff evidence without a CLI runner report', () => {
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const evidenceScriptPath = path.join(root, 'scripts/frontend-design-boost-image-evidence.mjs');
  const auditScriptPath = path.join(root, 'scripts/frontend-design-boost-goal-audit.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-built-in-imagegen-evidence');

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'generated-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const jobsPath = path.join(outDir, 'image-generation-jobs.json');
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const selectedAsset = handoff.assets[0];
  const { width, height } = parseSize(selectedAsset.size);
  const assetPath = path.join(root, selectedAsset.finalAssetPath);
  mkdirSync(path.dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, makeVisiblePng(width, height));

  const evidence = JSON.parse(execFileSync(process.execPath, [
    evidenceScriptPath,
    '--handoff',
    handoffPath,
    '--asset-id',
    selectedAsset.id,
    '--asset',
    assetPath,
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const evidenceText = JSON.stringify(evidence);
  assert.equal(evidence.schema, 'frontend-design-boost-image-evidence/v1');
  assert.equal(evidence.ok, true);
  assert.equal(evidence.liveGenerationEvidence, true);
  assert.equal(evidence.evidenceMode, 'built-in-imagegen-handoff');
  assert.equal(evidence.transport, 'built-in-imagegen');
  assert.equal(evidence.model, 'gpt-image-2');
  assert.equal(evidence.selectedJob.id, selectedAsset.id);
  assert.equal(evidence.runnerReport.supplied, false);
  assert.equal(evidence.builtInHandoff.supplied, true);
  assert.equal(evidence.builtInHandoff.valid, true);
  assert.equal(evidence.builtInHandoff.requiresOpenAiApiKey, false);
  assert.deepEqual(evidence.asset.dimensions, { width, height });
  assert.equal(evidence.asset.dimensionsMatch, true);
  assert.match(evidenceText, /CODEX_HOME\/generated_images/);
  assert.match(evidenceText, /asset smoke/i);
  assert.match(evidenceText, /desktop and mobile screenshot QA/i);

  const markdown = readFileSync(path.join(root, evidence.markdownPath), 'utf8');
  assert.match(markdown, /Built-in imagegen handoff/);
  assert.match(markdown, /does not require `OPENAI_API_KEY`/);

  const audit = JSON.parse(execFileSync(process.execPath, [
    auditScriptPath,
    '--jobs',
    jobsPath,
    '--live-evidence',
    path.join(root, evidence.reportPath),
    '--installed-skill',
    path.join(outDir, 'installed-skill')
  ], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENAI_API_KEY: ''
    }
  }));

  assert.equal(audit.liveGeneration.verified, true);
  assert.equal(audit.liveGeneration.transport, 'built-in-imagegen');
  assert.equal(audit.routeReadiness.defaultRouteSatisfied, true);
  assert.equal(audit.routeReadiness.cliFallbackRequired, false);
  assert.doesNotMatch(JSON.stringify(audit.blockedBy), /live-gpt-image-generation/);
  assert.doesNotMatch(JSON.stringify(audit.blockedBy), /image-generation-readiness/);
});

test('frontend design boost imports built-in imagegen outputs into project-local asset paths', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const importScriptPath = path.join(root, 'scripts/frontend-design-boost-imagegen-import.mjs');
  const smokeScriptPath = path.join(root, 'scripts/frontend-design-boost-asset-smoke.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-imagegen-import');

  assert.equal(
    packageJson.scripts?.['import:frontend-design-boost:imagegen-assets'],
    'node scripts/frontend-design-boost-imagegen-import.mjs'
  );
  assert.equal(existsSync(importScriptPath), true);

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'project-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const selectionPath = path.join(outDir, 'asset-selection.json');
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const selectedAsset = handoff.assets[0];
  const { width, height } = parseSize(selectedAsset.size);
  const builtInOutputPath = path.join(outDir, 'simulated-code-home-generated-images', `${selectedAsset.id}.png`);
  mkdirSync(path.dirname(builtInOutputPath), { recursive: true });
  writeFileSync(builtInOutputPath, makeVisiblePng(width, height));

  const report = JSON.parse(execFileSync(process.execPath, [
    importScriptPath,
    '--handoff',
    handoffPath,
    '--asset-id',
    selectedAsset.id,
    '--source',
    builtInOutputPath,
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(report.schema, 'frontend-design-boost-imagegen-import/v1');
  assert.equal(report.ok, true);
  assert.equal(report.imported, true);
  assert.equal(report.route, 'built-in-imagegen');
  assert.equal(report.requiresOpenAiApiKey, false);
  assert.equal(report.assets.length, 1);
  assert.equal(report.assets[0].assetId, selectedAsset.id);
  assert.equal(report.assets[0].copied, true);
  assert.equal(report.assets[0].dimensionsMatch, true);
  assert.match(report.assets[0].finalAssetPath, /project-assets\/visual-direction-1\.png/);
  assert.equal(existsSync(path.join(root, selectedAsset.finalAssetPath)), true);

  const markdown = readFileSync(path.join(root, report.markdownPath), 'utf8');
  assert.match(markdown, /Frontend Design Boost Imagegen Import/);
  assert.match(markdown, /CODEX_HOME\/generated_images/);
  assert.match(markdown, /asset smoke/i);

  const smoke = JSON.parse(execFileSync(process.execPath, [
    smokeScriptPath,
    '--selection',
    selectionPath,
    '--asset-id',
    selectedAsset.id
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(smoke.ok, true);
  assert.equal(smoke.assets[0].ok, true);
});

test('frontend design boost accepts built-in imagegen outputs through import smoke and evidence gates', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const acceptanceScriptPath = path.join(root, 'scripts/frontend-design-boost-imagegen-acceptance.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-imagegen-acceptance');

  assert.equal(
    packageJson.scripts?.['acceptance:frontend-design-boost:imagegen-assets'],
    'node scripts/frontend-design-boost-imagegen-acceptance.mjs'
  );
  assert.equal(existsSync(acceptanceScriptPath), true);

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'project-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const selectedAsset = handoff.assets[1];
  const { width, height } = parseSize(selectedAsset.size);
  const builtInOutputPath = path.join(outDir, 'simulated-code-home-generated-images', `${selectedAsset.id}.png`);
  mkdirSync(path.dirname(builtInOutputPath), { recursive: true });
  writeFileSync(builtInOutputPath, makeVisiblePng(width, height));

  const report = JSON.parse(execFileSync(process.execPath, [
    acceptanceScriptPath,
    '--handoff',
    handoffPath,
    '--asset-id',
    selectedAsset.id,
    '--source',
    builtInOutputPath,
    '--out-dir',
    outDir,
    '--installed-skill',
    path.join(outDir, 'installed-skill')
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(report.schema, 'frontend-design-boost-imagegen-acceptance/v1');
  assert.equal(report.ok, true);
  assert.equal(report.executed, false);
  assert.equal(report.route, 'built-in-imagegen');
  assert.equal(report.assetId, selectedAsset.id);
  assert.equal(report.importReport.ok, true);
  assert.equal(report.assetSmoke.ok, true);
  assert.equal(report.imageEvidence.liveGenerationEvidence, true);
  assert.equal(report.goalAudit.schema, 'frontend-design-boost-goal-audit/v1');
  assert.equal(report.goalAudit.liveGeneration.verified, true);
  assert.equal(report.goalAudit.imagegenAcceptance.supplied, true);
  assert.equal(report.goalAudit.imagegenAcceptance.valid, true);
  assert.equal(report.goalAudit.imagegenAcceptance.provenanceReady, false);
  assert.match(JSON.stringify(report.goalAudit.imagegenAcceptance.blockedBy), /CODEX_HOME\/generated_images/);
  assert.match(JSON.stringify(report.goalAudit.blockedBy), /built-in imagegen provenance/i);
  assert.match(report.evidencePath, /image-evidence-report\.json/);
  assert.match(report.goalAuditPath, /goal-audit-report\.json/);
  assert.match(report.markdownPath, /imagegen-acceptance\.md/);
  assert.match(JSON.stringify(report.nextGates), /desktop and mobile screenshot QA/i);

  const markdown = readFileSync(path.join(root, report.markdownPath), 'utf8');
  assert.match(markdown, /Frontend Design Boost Imagegen Acceptance/);
  assert.match(markdown, /asset smoke/i);
  assert.match(markdown, /image evidence/i);
});

test('frontend design boost imagegen acceptance chains the implementation handoff', () => {
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const acceptanceScriptPath = path.join(root, 'scripts/frontend-design-boost-imagegen-acceptance.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-imagegen-acceptance-handoff');

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'project-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const selectedAsset = handoff.assets[0];
  const { width, height } = parseSize(selectedAsset.size);
  const simulatedCodexHome = path.join(outDir, 'codex-home');
  const builtInOutputPath = path.join(simulatedCodexHome, 'generated_images', `${selectedAsset.id}.png`);
  mkdirSync(path.dirname(builtInOutputPath), { recursive: true });
  writeFileSync(builtInOutputPath, makeVisiblePng(width, height));

  const report = JSON.parse(execFileSync(process.execPath, [
    acceptanceScriptPath,
    '--handoff',
    handoffPath,
    '--asset-id',
    selectedAsset.id,
    '--source',
    builtInOutputPath,
    '--out-dir',
    outDir,
    '--installed-skill',
    path.join(outDir, 'installed-skill')
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-imagegen-acceptance/v1');
  assert.equal(report.assetIntake.schema, 'frontend-design-boost-asset-intake/v1');
  assert.equal(report.assetDecision.schema, 'frontend-design-boost-image-decision/v1');
  assert.equal(report.implementationHandoff.schema, 'frontend-design-boost-image-implementation-handoff/v1');
  assert.equal(report.implementationHandoff.readyForImplementation, true);
  assert.equal(report.implementationHandoff.selectedAsset.id, selectedAsset.id);
  assert.equal(report.implementationHandoff.routeEvidence.transport, 'built-in-imagegen');
  assert.equal(report.implementationHandoff.routeEvidence.provenanceReady, true);
  assert.match(report.implementationHandoffPath, /image-implementation-handoff-report\.json/);
  assert.match(reportText, /Design Token Extraction/);
  assert.match(reportText, /Implementation Checklist/);
  assert.match(JSON.stringify(report.nextGates), /Wire the accepted asset into the UI/i);
  assert.equal(existsSync(path.join(root, report.implementationHandoffPath)), true);
  assert.equal(existsSync(path.join(root, report.implementationHandoff.markdownPath)), true);

  const markdown = readFileSync(path.join(root, report.markdownPath), 'utf8');
  assert.match(markdown, /Implementation handoff: pass/i);
  assert.match(markdown, /image-implementation-handoff-report\.json/);
});

test('frontend design boost goal audit requires implementation handoff before completion', () => {
  const syncScriptPath = path.join(root, 'scripts/frontend-design-boost-skill-sync.mjs');
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const acceptanceScriptPath = path.join(root, 'scripts/frontend-design-boost-imagegen-acceptance.mjs');
  const auditScriptPath = path.join(root, 'scripts/frontend-design-boost-goal-audit.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-goal-audit-implementation-handoff');
  const currentInstalledSkillPath = path.join(outDir, 'current-installed-skill');

  execFileSync(process.execPath, [
    syncScriptPath,
    '--installed-skill',
    currentInstalledSkillPath,
    '--apply'
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'project-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const selectedAsset = handoff.assets[0];
  const { width, height } = parseSize(selectedAsset.size);
  const simulatedCodexHome = path.join(outDir, 'codex-home');
  const builtInOutputPath = path.join(simulatedCodexHome, 'generated_images', `${selectedAsset.id}.png`);
  mkdirSync(path.dirname(builtInOutputPath), { recursive: true });
  writeFileSync(builtInOutputPath, makeVisiblePng(width, height));

  const acceptance = JSON.parse(execFileSync(process.execPath, [
    acceptanceScriptPath,
    '--handoff',
    handoffPath,
    '--asset-id',
    selectedAsset.id,
    '--source',
    builtInOutputPath,
    '--out-dir',
    outDir,
    '--installed-skill',
    currentInstalledSkillPath,
    '--codex-home',
    simulatedCodexHome
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(acceptance.implementationHandoff.readyForImplementation, true);
  assert.equal(acceptance.goalAudit.implementationHandoff.supplied, true);
  assert.equal(acceptance.goalAudit.implementationHandoff.readyForImplementation, true);
  assert.equal(acceptance.goalAudit.goalComplete, true);
  assert.doesNotMatch(JSON.stringify(acceptance.goalAudit.blockedBy), /image implementation handoff/i);

  const auditWithoutHandoff = JSON.parse(execFileSync(process.execPath, [
    auditScriptPath,
    '--jobs',
    path.join(outDir, 'image-generation-jobs.json'),
    '--live-evidence',
    path.join(root, acceptance.evidencePath),
    '--imagegen-acceptance',
    path.join(root, acceptance.reportPath),
    '--installed-skill',
    currentInstalledSkillPath,
    '--codex-home',
    simulatedCodexHome
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  assert.equal(auditWithoutHandoff.goalComplete, false);
  assert.match(JSON.stringify(auditWithoutHandoff.blockedBy), /image implementation handoff/i);
});

test('frontend design boost emits an implementation handoff from image decision and imagegen acceptance', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const acceptanceScriptPath = path.join(root, 'scripts/frontend-design-boost-imagegen-acceptance.mjs');
  const intakeScriptPath = path.join(root, 'scripts/frontend-design-boost-asset-intake.mjs');
  const decisionScriptPath = path.join(root, 'scripts/frontend-design-boost-image-decision.mjs');
  const handoffScriptPath = path.join(root, 'scripts/frontend-design-boost-image-implementation-handoff.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-implementation-handoff');

  assert.equal(
    packageJson.scripts?.['handoff:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-implementation-handoff.mjs'
  );
  assert.equal(existsSync(handoffScriptPath), true);

  execFileSync(process.execPath, [
    assistScriptPath,
    '--brief',
    'fixtures/frontend-design-boost/saas-dashboard-brief.md',
    '--reference-intake',
    'fixtures/frontend-design-boost/reference-intake.md',
    '--out-dir',
    outDir,
    '--asset-out-dir',
    path.join(outDir, 'project-assets')
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const selectedAsset = handoff.assets[0];
  const { width, height } = parseSize(selectedAsset.size);
  const builtInOutputPath = path.join(outDir, 'codex-home', 'generated_images', `${selectedAsset.id}.png`);
  mkdirSync(path.dirname(builtInOutputPath), { recursive: true });
  writeFileSync(builtInOutputPath, makeVisiblePng(width, height));

  const acceptance = JSON.parse(execFileSync(process.execPath, [
    acceptanceScriptPath,
    '--handoff',
    handoffPath,
    '--asset-id',
    selectedAsset.id,
    '--source',
    builtInOutputPath,
    '--out-dir',
    outDir,
    '--installed-skill',
    path.join(outDir, 'installed-skill')
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const intake = JSON.parse(execFileSync(process.execPath, [
    intakeScriptPath,
    '--manifest',
    path.join(outDir, 'image-prompts.json'),
    '--selection',
    path.join(outDir, 'asset-selection.json'),
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const decision = JSON.parse(execFileSync(process.execPath, [
    decisionScriptPath,
    '--intake',
    path.join(root, intake.reportPath),
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const report = JSON.parse(execFileSync(process.execPath, [
    handoffScriptPath,
    '--decision',
    path.join(root, decision.reportPath),
    '--evidence',
    path.join(root, acceptance.evidencePath),
    '--acceptance',
    path.join(root, acceptance.reportPath),
    '--asset-id',
    selectedAsset.id,
    '--out-dir',
    outDir
  ], {
    cwd: root,
    encoding: 'utf8'
  }));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-image-implementation-handoff/v1');
  assert.equal(report.executed, false);
  assert.equal(report.readyForImplementation, true);
  assert.equal(report.selectedAsset.id, selectedAsset.id);
  assert.equal(report.routeEvidence.model, 'gpt-image-2');
  assert.equal(report.routeEvidence.transport, 'built-in-imagegen');
  assert.equal(report.routeEvidence.provenanceReady, true);
  assert.match(report.selectedAsset.projectLocalAssetPath, /project-assets\/visual-direction-1\.png/);
  assert.match(reportText, /Design Token Extraction/);
  assert.match(reportText, /Implementation Checklist/);
  assert.match(reportText, /HTML, React, or Tailwind/);
  assert.match(reportText, /desktop and mobile screenshot QA/i);
  assert.doesNotMatch(reportText, /missing live image evidence/i);
  assert.equal(existsSync(path.join(root, report.reportPath)), true);
  assert.equal(existsSync(path.join(root, report.markdownPath)), true);

  const markdown = readFileSync(path.join(root, report.markdownPath), 'utf8');
  assert.match(markdown, /# Frontend Design Boost Image Implementation Handoff/);
  assert.match(markdown, /Design Token Extraction/);
  assert.match(markdown, /Implementation Checklist/);
  assert.match(markdown, /Do Not Copy/);
  assert.match(markdown, /gpt-image-2/);
});

test('frontend design boost docs include a compact operating entrypoint', () => {
  const readmePath = path.join(root, 'docs/frontend-design-boost/README.md');
  assert.equal(existsSync(readmePath), true);

  const readme = readFileSync(readmePath, 'utf8');
  const visualChecklist = readText('docs/frontend-design-boost/visual-qa-checklist.md');

  assert.match(readme, /npm\.cmd run qa:frontend-design-boost/);
  assert.match(readme, /docs\/frontend-design-boost\/skill\/frontend-design-boost/);
  assert.match(readme, /fixtures\/frontend-design-boost\/dashboard-demo\.html/);
  assert.match(readme, /fixtures\/frontend-design-boost\/reference-intake\.md/);
  assert.match(readme, /integration-candidate-shortlist\.md/);
  assert.match(visualChecklist, /run `npm\.cmd run qa:frontend-design-boost`/);
});

test('frontend design boost guidance names external references and accessibility gates', () => {
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const visualChecklist = readText('docs/frontend-design-boost/visual-qa-checklist.md');
  const companionSkills = readText('docs/frontend-design-boost/companion-skills.md');
  const skillCompanionSkills = readText('docs/frontend-design-boost/skill/frontend-design-boost/references/companion-skills.md');

  assert.match(skill, /deep-research-dag/);
  assert.match(referenceBank, /Radix/);
  assert.match(referenceBank, /WAI-ARIA/);
  assert.match(referenceBank, /WCAG 2\.2/);
  assert.match(referenceBank, /Material Design data tables?/i);
  assert.match(visualChecklist, /24(?: x| by )24/i);
  assert.match(visualChecklist, /focus appearance/i);
  assert.match(companionSkills, /deep-research-dag/);
  assert.match(companionSkills, /@Product Design/);
  assert.match(companionSkills, /product-design-plugin-bridge\.md/);
  assert.match(companionSkills, /readiness:frontend-design-boost:product-design/);
  assert.match(companionSkills, /No Visual Target, No Build/);
  assert.match(companionSkills, /design-qa\.md/);
  assert.match(skillCompanionSkills, /@Product Design/);
  assert.match(skillCompanionSkills, /product-design-plugin-bridge\.md/);
  assert.match(skillCompanionSkills, /readiness:frontend-design-boost:product-design/);
  assert.match(skillCompanionSkills, /No Visual Target, No Build/);
  assert.match(skillCompanionSkills, /design-qa\.md/);
});

test('frontend design boost exposes a local dashboard case library', () => {
  const readme = readText('docs/frontend-design-boost/README.md');
  const prompt = readText('docs/frontend-design-boost/prompt.md');
  const spec = readText('docs/frontend-design-boost/spec.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const caseIndexPath = path.join(root, 'docs/frontend-design-boost/case-library/README.md');
  const caseStudyPath = path.join(
    root,
    'docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md'
  );

  assert.equal(existsSync(caseIndexPath), true);
  assert.equal(existsSync(caseStudyPath), true);

  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const caseStudy = readText('docs/frontend-design-boost/case-library/ocmacro-trump-dashboard.md');

  assert.match(readme, /case-library\/README\.md/);
  assert.match(readme, /ocmacro-trump-dashboard\.md/);
  assert.match(prompt, /local case library/);
  assert.match(spec, /local case library/);
  assert.match(skill, /case-library\/ocmacro-trump-dashboard\.md/);
  assert.match(referenceBank, /OCMacro Trump dashboard case/);
  assert.match(caseIndex, /ocmacro-trump-dashboard\.md/);
  assert.match(caseIndex, /shadcn-dashboard-block\.md/);
  assert.match(caseIndex, /research-dashboard/);
  assert.match(caseIndex, /chart-led/);
  assert.match(caseIndex, /event-log/);
  assert.match(caseIndex, /mobile-hierarchy/);
  assert.match(caseStudy, /https:\/\/ocmacro\.com\/dashboard\/trump/);
  assert.match(caseStudy, /Tags: `research-dashboard`/);
  assert.match(caseStudy, /desktop-1440x900\.png/);
  assert.match(caseStudy, /mobile-390x844\.png/);
  assert.match(caseStudy, /chart plus event log/i);
  assert.match(caseStudy, /Local Study Cards/);
  assert.match(caseStudy, /Top bar and navigation organization/);
  assert.match(caseStudy, /threat, drawdown, and meaning/);
  assert.match(caseStudy, /Mobile first-view conclusion/);
  assert.match(caseStudy, /Do not copy the site's screenshots/);
});

test('frontend design boost exposes a source-backed shadcn dashboard case', () => {
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const shadcnCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/shadcn-dashboard-block.md'
  );

  assert.equal(existsSync(shadcnCasePath), true);

  const shadcnCase = readText('docs/frontend-design-boost/case-library/shadcn-dashboard-block.md');
  assert.match(referenceBank, /shadcn dashboard block case/i);
  assert.match(shadcnCase, /https:\/\/v3\.shadcn\.com\/blocks/);
  assert.match(shadcnCase, /dashboard-01/);
  assert.match(shadcnCase, /AppSidebar/);
  assert.match(shadcnCase, /SectionCards/);
  assert.match(shadcnCase, /DataTable/);
  assert.match(shadcnCase, /component ownership/i);
  assert.match(shadcnCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed Cloudscape service dashboard case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const cloudscapeCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/cloudscape-service-dashboard.md'
  );

  assert.equal(existsSync(cloudscapeCasePath), true);

  const cloudscapeCase = readText(
    'docs/frontend-design-boost/case-library/cloudscape-service-dashboard.md'
  );
  assert.match(caseIndex, /cloudscape-service-dashboard\.md/);
  assert.match(referenceBank, /Cloudscape service dashboard case/i);
  assert.match(cloudscapeCase, /https:\/\/cloudscape\.design\/demos\/overview/);
  assert.match(cloudscapeCase, /https:\/\/cloudscape\.design\/patterns\/general\/filter-patterns\//);
  assert.match(cloudscapeCase, /property filter/i);
  assert.match(cloudscapeCase, /table and card views/i);
  assert.match(cloudscapeCase, /resource collection/i);
  assert.match(cloudscapeCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed Shopify resource index case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const shopifyCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/shopify-resource-index.md'
  );

  assert.equal(existsSync(shopifyCasePath), true);

  const shopifyCase = readText('docs/frontend-design-boost/case-library/shopify-resource-index.md');
  assert.match(caseIndex, /shopify-resource-index\.md/);
  assert.match(referenceBank, /Shopify resource index case/i);
  assert.match(shopifyCase, /https:\/\/polaris-react\.shopify\.com\/patterns\/resource-index-layout/);
  assert.match(shopifyCase, /https:\/\/polaris-react\.shopify\.com\/components\/lists\/resource-list/);
  assert.match(shopifyCase, /https:\/\/polaris-react\.shopify\.com\/components\/selection-and-input\/index-filters/);
  assert.match(shopifyCase, /index filters/i);
  assert.match(shopifyCase, /multi-select/i);
  assert.match(shopifyCase, /resource index/i);
  assert.match(shopifyCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed Elastic EUI data grid case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const elasticCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/elastic-eui-data-grid.md'
  );

  assert.equal(existsSync(elasticCasePath), true);

  const elasticCase = readText('docs/frontend-design-boost/case-library/elastic-eui-data-grid.md');
  assert.match(caseIndex, /elastic-eui-data-grid\.md/);
  assert.match(referenceBank, /Elastic EUI data grid case/i);
  assert.match(elasticCase, /https:\/\/eui\.elastic\.co\/docs\/components\/data-grid\//);
  assert.match(elasticCase, /many columns/i);
  assert.match(elasticCase, /schemas and sorting/i);
  assert.match(elasticCase, /control columns/i);
  assert.match(elasticCase, /toolbar/i);
  assert.match(elasticCase, /truncation/i);
  assert.match(elasticCase, /popovers/i);
  assert.match(elasticCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed GOV.UK task list case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const govukCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/govuk-task-list-flow.md'
  );

  assert.equal(existsSync(govukCasePath), true);

  const govukCase = readText('docs/frontend-design-boost/case-library/govuk-task-list-flow.md');
  assert.match(caseIndex, /govuk-task-list-flow\.md/);
  assert.match(referenceBank, /GOV\.UK task list case/i);
  assert.match(govukCase, /https:\/\/design-system\.service\.gov\.uk\/components\/task-list\//);
  assert.match(govukCase, /https:\/\/design-system\.service\.gov\.uk\/patterns\/question-pages\//);
  assert.match(govukCase, /one question per page/i);
  assert.match(govukCase, /Back link/);
  assert.match(govukCase, /Continue/);
  assert.match(govukCase, /task status/i);
  assert.match(govukCase, /long, complex services/i);
  assert.match(govukCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed Stripe API reference case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const stripeCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/stripe-api-reference.md'
  );

  assert.equal(existsSync(stripeCasePath), true);

  const stripeCase = readText('docs/frontend-design-boost/case-library/stripe-api-reference.md');
  assert.match(caseIndex, /stripe-api-reference\.md/);
  assert.match(referenceBank, /Stripe API reference case/i);
  assert.match(stripeCase, /https:\/\/docs\.stripe\.com\/api/);
  assert.match(stripeCase, /predictable resource-oriented URLs/i);
  assert.match(stripeCase, /client libraries/i);
  assert.match(stripeCase, /Copy for LLM/);
  assert.match(stripeCase, /code examples/i);
  assert.match(stripeCase, /object hierarchy/i);
  assert.match(stripeCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed Tremor chart dashboard case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const tremorCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/tremor-chart-dashboard.md'
  );

  assert.equal(existsSync(tremorCasePath), true);

  const tremorCase = readText('docs/frontend-design-boost/case-library/tremor-chart-dashboard.md');
  assert.match(caseIndex, /tremor-chart-dashboard\.md/);
  assert.match(referenceBank, /Tremor chart dashboard case/i);
  assert.match(tremorCase, /https:\/\/www\.tremor\.so\//);
  assert.match(tremorCase, /https:\/\/tremor\.so\/charts/);
  assert.match(tremorCase, /real-world situations/i);
  assert.match(tremorCase, /35\+ fully open-source/i);
  assert.match(tremorCase, /Recharts/i);
  assert.match(tremorCase, /Radix UI/i);
  assert.match(tremorCase, /KPI-to-chart rhythm/i);
  assert.match(tremorCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed Ant Design Pro admin case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const antCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/ant-design-pro-admin.md'
  );

  assert.equal(existsSync(antCasePath), true);

  const antCase = readText('docs/frontend-design-boost/case-library/ant-design-pro-admin.md');
  assert.match(caseIndex, /ant-design-pro-admin\.md/);
  assert.match(referenceBank, /Ant Design Pro admin case/i);
  assert.match(antCase, /https:\/\/ant\.design\/docs\/spec\/introduce/);
  assert.match(antCase, /https:\/\/ant\.design\/components\/table/);
  assert.match(antCase, /https:\/\/ant\.design\/components\/form/);
  assert.match(antCase, /https:\/\/ant\.design\/components\/drawer/);
  assert.match(antCase, /https:\/\/procomponents\.ant\.design\/components\/table/);
  assert.match(antCase, /enterprise admin/i);
  assert.match(antCase, /ProTable/i);
  assert.match(antCase, /query form/i);
  assert.match(antCase, /drawer/i);
  assert.match(antCase, /editable records/i);
  assert.match(antCase, /acceptance gate/i);
});

test('frontend design boost exposes a source-backed MUI X data grid case', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const muiCasePath = path.join(
    root,
    'docs/frontend-design-boost/case-library/mui-x-data-grid.md'
  );

  assert.equal(existsSync(muiCasePath), true);

  const muiCase = readText('docs/frontend-design-boost/case-library/mui-x-data-grid.md');
  assert.match(caseIndex, /mui-x-data-grid\.md/);
  assert.match(referenceBank, /MUI X data grid case/i);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/react-data-grid\/sorting\//);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/react-data-grid\/filtering\//);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/react-data-grid\/pagination\//);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/react-data-grid\/editing\//);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/react-data-grid\/column-pinning\//);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/react-data-grid\/accessibility\//);
  assert.match(muiCase, /https:\/\/mui\.com\/x\/introduction\/licensing\//);
  assert.match(muiCase, /license tier/i);
  assert.match(muiCase, /virtualization/i);
  assert.match(muiCase, /column controls/i);
  assert.match(muiCase, /keyboard/i);
  assert.match(muiCase, /long-cell/i);
  assert.match(muiCase, /acceptance gate/i);
});

test('frontend design boost skill entrypoint lists promoted case-library cases', () => {
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const promotedCases = [
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

  for (const casePath of promotedCases) {
    assert.match(skill, new RegExp(casePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(driftScript, new RegExp(casePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('frontend design boost tracks candidate cases for future skill strengthening', () => {
  const caseIndex = readText('docs/frontend-design-boost/case-library/README.md');
  const backlogPath = path.join(root, 'docs/frontend-design-boost/case-library/candidate-backlog.md');

  assert.equal(existsSync(backlogPath), true);

  const backlog = readText('docs/frontend-design-boost/case-library/candidate-backlog.md');
  assert.match(caseIndex, /candidate-backlog\.md/);
  assert.match(backlog, /shadcn\/ui dashboard block/i);
  assert.match(backlog, /Cloudscape service dashboard/i);
  assert.match(backlog, /Shopify Polaris resource index/i);
  assert.match(backlog, /Elastic EUI data grid/i);
  assert.match(backlog, /GOV\.UK task list/i);
  assert.match(backlog, /acceptance gate/i);
  assert.match(backlog, /do not copy/i);
});

test('frontend design boost tracks external integration candidates for user selection', () => {
  const shortlistPath = path.join(root, 'docs/frontend-design-boost/integration-candidate-shortlist.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');

  assert.equal(existsSync(shortlistPath), true);

  const shortlist = readText('docs/frontend-design-boost/integration-candidate-shortlist.md');
  assert.match(referenceBank, /integration candidate shortlist/i);
  assert.match(shortlist, /Selection Matrix/i);
  assert.match(shortlist, /Ant Design/i);
  assert.match(shortlist, /MUI X Data Grid/i);
  assert.match(shortlist, /Carbon Design System/i);
  assert.match(shortlist, /Microsoft Fluent 2/i);
  assert.match(shortlist, /SAP Fiori/i);
  assert.match(shortlist, /AG Grid/i);
  assert.match(shortlist, /TanStack Table/i);
  assert.match(shortlist, /Storybook/i);
  assert.match(shortlist, /Chromatic/i);
  assert.match(shortlist, /Percy/i);
  assert.match(shortlist, /v0/i);
  assert.match(shortlist, /Mobbin/i);
  assert.match(shortlist, /Recommended Next Promotions/i);
});

test('frontend design boost provides an integration selection rubric', () => {
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const rubricPath = path.join(root, 'docs/frontend-design-boost/integration-selection-rubric.md');

  assert.equal(existsSync(rubricPath), true);

  const rubric = readText('docs/frontend-design-boost/integration-selection-rubric.md');
  assert.match(readme, /integration-selection-rubric\.md/);
  assert.match(referenceBank, /integration selection rubric/i);
  assert.match(rubric, /Scoring Axes/i);
  assert.match(rubric, /Integration Mode Decision/i);
  assert.match(rubric, /Candidate Scorecard Template/i);
  assert.match(rubric, /Promote to full case note/i);
  assert.match(rubric, /Synthetic fixture/i);
  assert.match(rubric, /QA gate/i);
  assert.match(rubric, /Runtime dependency proposal/i);
  assert.match(rubric, /Reject or defer/i);
});

test('frontend design boost documents image-assisted frontend workflows', () => {
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const workflowPath = path.join(root, 'docs/frontend-design-boost/image-assisted-frontend-workflow.md');

  assert.equal(existsSync(workflowPath), true);

  const workflow = readText('docs/frontend-design-boost/image-assisted-frontend-workflow.md');
  assert.match(readme, /image-assisted-frontend-workflow\.md/);
  assert.match(referenceBank, /image assisted frontend workflow/i);
  assert.match(skill, /image-assisted-frontend-workflow\.md/);
  assert.match(driftScript, /image-assisted-frontend-workflow\.md/);
  assert.match(driftScript, /asset-selection bridge/);
  assert.match(driftScript, /asset-consumption-demo\.html/);
  assert.match(driftScript, /imagegen-handoff\.json/);
  assert.match(driftScript, /reference intake/i);
  assert.match(driftScript, /image-generation-jobs\.json/);
  assert.match(driftScript, /frontend-design-boost-goal-audit\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-acceptance\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-decision\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-evidence\.mjs/);
  assert.match(driftScript, /frontend-design-boost-imagegen-import\.mjs/);
  assert.match(driftScript, /frontend-design-boost-imagegen-acceptance\.mjs/);
  assert.match(driftScript, /frontend-design-boost-ccswitch-acceptance\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-jobs-plan\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-jobs-run\.mjs/);
  assert.match(driftScript, /frontend-design-boost-image-workflow\.mjs/);
  assert.match(driftScript, /flow:frontend-design-boost:image/);
  assert.match(driftScript, /acceptance:frontend-design-boost:image/);
  assert.match(driftScript, /decision:frontend-design-boost:image/);
  assert.match(driftScript, /evidence:frontend-design-boost:image/);
  assert.match(driftScript, /import:frontend-design-boost:imagegen-assets/);
  assert.match(driftScript, /acceptance:frontend-design-boost:imagegen-assets/);
  assert.match(driftScript, /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(driftScript, /frontend-design-boost-asset-intake\.mjs/);
  assert.match(driftScript, /intake:frontend-design-boost:assets/);
  assert.match(driftScript, /frontend-design-boost-skill-readiness\.mjs/);
  assert.match(driftScript, /readiness:frontend-design-boost-skill/);
  assert.match(workflow, /audit:frontend-design-boost:goal/);
  assert.match(workflow, /run:frontend-design-boost:image-job/);
  assert.match(workflow, /flow:frontend-design-boost:image/);
  assert.match(workflow, /acceptance:frontend-design-boost:image/);
  assert.match(workflow, /decision:frontend-design-boost:image/);
  assert.match(workflow, /evidence:frontend-design-boost:image/);
  assert.match(workflow, /acceptance:frontend-design-boost:imagegen-assets/);
  assert.match(workflow, /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(workflow, /--imagegen-acceptance/);
  assert.match(workflow, /--implementation-handoff/);
  assert.match(workflow, /goal-audit-report\.json/);
  assert.match(workflow, /intake:frontend-design-boost:assets/);
  assert.match(workflow, /gpt-image-2/);
  assert.match(workflow, /ccswitch/);
  assert.match(workflow, /lab:frontend-design-boost:image/);
  assert.match(workflow, /Visual Direction/);
  assert.match(workflow, /Project Assets/);
  assert.match(workflow, /Extraction Checklist/);
  assert.match(workflow, /Prompt Templates/);
  assert.match(workflow, /Do Not Use For/);
  assert.match(workflow, /Screenshot QA/);
  assert.match(workflow, /asset-selection\.json/);
  assert.match(workflow, /asset-consumption-demo\.html/);
  assert.match(workflow, /imagegen-handoff\.json/);
  assert.match(workflow, /image-generation-jobs\.json/);
  assert.match(workflow, /plan:frontend-design-boost:image-jobs/);
  assert.match(workflow, /--reference-intake/);
  assert.match(workflow, /reference intake/i);
  assert.match(readme, /asset-selection\.json/);
  assert.match(readme, /imagegen-handoff\.json/);
  assert.match(readme, /image-generation-jobs\.json/);
  assert.match(readme, /plan:frontend-design-boost:image-jobs/);
  assert.match(readme, /run:frontend-design-boost:image-job/);
  assert.match(readme, /flow:frontend-design-boost:image/);
  assert.match(readme, /acceptance:frontend-design-boost:image/);
  assert.match(readme, /decision:frontend-design-boost:image/);
  assert.match(readme, /evidence:frontend-design-boost:image/);
  assert.match(readme, /import:frontend-design-boost:imagegen-assets/);
  assert.match(readme, /acceptance:frontend-design-boost:imagegen-assets/);
  assert.match(readme, /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(readme, /--imagegen-acceptance/);
  assert.match(readme, /--implementation-handoff/);
  assert.match(readme, /goal-audit-report\.json/);
  assert.match(readme, /intake:frontend-design-boost:assets/);
  assert.match(readme, /readiness:frontend-design-boost-skill/);
  assert.match(referenceBank, /reference-intake\.md/);
  assert.match(referenceBank, /image-generation-jobs\.json/);
  assert.match(referenceBank, /imagegen-handoff\.json/);
  assert.match(referenceBank, /frontend-design-boost-image-jobs-plan\.mjs/);
  assert.match(referenceBank, /frontend-design-boost-image-acceptance\.mjs/);
  assert.match(referenceBank, /acceptance:frontend-design-boost:image/);
  assert.match(referenceBank, /frontend-design-boost-image-decision\.mjs/);
  assert.match(referenceBank, /decision:frontend-design-boost:image/);
  assert.match(referenceBank, /frontend-design-boost-image-evidence\.mjs/);
  assert.match(referenceBank, /evidence:frontend-design-boost:image/);
  assert.match(referenceBank, /frontend-design-boost-imagegen-import\.mjs/);
  assert.match(referenceBank, /imagegen-import-report\.json/);
  assert.match(referenceBank, /frontend-design-boost-imagegen-acceptance\.mjs/);
  assert.match(referenceBank, /frontend-design-boost-ccswitch-acceptance\.mjs/);
  assert.match(referenceBank, /imagegen-acceptance-report\.json/);
  assert.match(referenceBank, /ccswitch-acceptance-report\.json/);
  assert.match(referenceBank, /built-in imagegen provenance/i);
  assert.match(referenceBank, /--imagegen-acceptance/);
  assert.match(referenceBank, /--implementation-handoff/);
  assert.match(referenceBank, /goal-audit-report\.json/);
  assert.match(referenceBank, /frontend-design-boost-goal-audit\.mjs/);
  assert.match(referenceBank, /audit:frontend-design-boost:goal/);
  assert.match(referenceBank, /frontend-design-boost-asset-intake\.mjs/);
  assert.match(referenceBank, /asset-consumption-demo\.html/);
  assert.match(skill, /asset-selection bridge/);
  assert.match(skill, /imagegen-handoff\.json/);
  assert.match(skill, /image-generation-jobs\.json/);
  assert.match(skill, /frontend-design-boost-image-jobs-plan\.mjs/);
  assert.match(skill, /frontend-design-boost-image-jobs-run\.mjs/);
  assert.match(skill, /frontend-design-boost-image-workflow\.mjs/);
  assert.match(skill, /flow:frontend-design-boost:image/);
  assert.match(skill, /frontend-design-boost-image-acceptance\.mjs/);
  assert.match(skill, /acceptance:frontend-design-boost:image/);
  assert.match(skill, /frontend-design-boost-image-decision\.mjs/);
  assert.match(skill, /decision:frontend-design-boost:image/);
  assert.match(skill, /frontend-design-boost-image-evidence\.mjs/);
  assert.match(skill, /evidence:frontend-design-boost:image/);
  assert.match(skill, /frontend-design-boost-imagegen-import\.mjs/);
  assert.match(skill, /import:frontend-design-boost:imagegen-assets/);
  assert.match(skill, /frontend-design-boost-imagegen-acceptance\.mjs/);
  assert.match(skill, /frontend-design-boost-ccswitch-acceptance\.mjs/);
  assert.match(skill, /acceptance:frontend-design-boost:imagegen-assets/);
  assert.match(skill, /acceptance:frontend-design-boost:ccswitch-assets/);
  assert.match(skill, /--imagegen-acceptance/);
  assert.match(skill, /--implementation-handoff/);
  assert.match(skill, /goal-audit-report\.json/);
  assert.match(skill, /frontend-design-boost-asset-intake\.mjs/);
  assert.match(skill, /intake:frontend-design-boost:assets/);
  assert.match(skill, /frontend-design-boost-skill-readiness\.mjs/);
  assert.match(skill, /readiness:frontend-design-boost-skill/);
  assert.match(skill, /reference intake/i);
  assert.match(workflow, /background=transparent/);
});

test('frontend design boost builds a gpt-image prompt pack', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const scriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const qaScriptPath = path.join(root, 'scripts/frontend-design-boost-image-pack-qa.mjs');
  const briefPath = path.join(root, 'fixtures/frontend-design-boost/image-assisted-brief.md');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-prompt-pack');

  assert.equal(
    packageJson.scripts?.['lab:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-assist.mjs'
  );
  assert.equal(
    packageJson.scripts?.['qa:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-pack-qa.mjs'
  );
  assert.equal(existsSync(scriptPath), true);
  assert.equal(existsSync(qaScriptPath), true);
  assert.equal(existsSync(briefPath), true);

  mkdirSync(outDir, { recursive: true });
  execFileSync(process.execPath, [scriptPath, '--out-dir', outDir], {
    cwd: root,
    encoding: 'utf8'
  });

  const manifestPath = path.join(outDir, 'image-prompts.json');
  const selectionPath = path.join(outDir, 'asset-selection.json');
  const readmePath = path.join(outDir, 'README.md');
  const previewPath = path.join(outDir, 'preview.html');
  const consumptionDemoPath = path.join(outDir, 'asset-consumption-demo.html');
  const commandsPath = path.join(outDir, 'imagegen-commands.ps1');
  const jobsPath = path.join(outDir, 'image-generation-jobs.json');
  const handoffPath = path.join(outDir, 'imagegen-handoff.json');
  const handoffMarkdownPath = path.join(outDir, 'imagegen-handoff.md');

  assert.equal(existsSync(manifestPath), true);
  assert.equal(existsSync(selectionPath), true);
  assert.equal(existsSync(readmePath), true);
  assert.equal(existsSync(previewPath), true);
  assert.equal(existsSync(consumptionDemoPath), true);
  assert.equal(existsSync(commandsPath), true);
  assert.equal(existsSync(jobsPath), true);
  assert.equal(existsSync(handoffPath), true);
  assert.equal(existsSync(handoffMarkdownPath), true);

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const selection = JSON.parse(readFileSync(selectionPath, 'utf8'));
  const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
  const handoff = JSON.parse(readFileSync(handoffPath, 'utf8'));
  const manifestText = JSON.stringify(manifest);
  const selectionText = JSON.stringify(selection);
  const jobsText = JSON.stringify(jobs);
  const handoffText = JSON.stringify(handoff);
  const readme = readFileSync(readmePath, 'utf8');
  const preview = readFileSync(previewPath, 'utf8');
  const consumptionDemo = readFileSync(consumptionDemoPath, 'utf8');
  const commands = readFileSync(commandsPath, 'utf8');
  const handoffMarkdown = readFileSync(handoffMarkdownPath, 'utf8');

  assert.equal(manifest.model, 'gpt-image-2');
  assert.equal(manifest.transport, 'built-in-imagegen');
  assert.equal(manifest.environmentRequirements.length, 0);
  assert.equal(manifest.defaultRoute.transport, 'built-in-imagegen');
  assert.equal(manifest.defaultRoute.requiresOpenAiApiKey, false);
  assert.equal(manifest.fallbackRoute.transport, 'ccswitch');
  assert.deepEqual(manifest.fallbackRoute.environmentRequirements, ['OPENAI_API_KEY']);
  assert.match(manifest.sourceBrief, /fixtures\/frontend-design-boost\/image-assisted-brief\.md/);
  assert.match(manifest.assetSelectionPath, /asset-selection\.json/);
  assert.match(manifest.assetConsumptionDemoPath, /asset-consumption-demo\.html/);
  assert.match(manifest.imagegenHandoffPath, /imagegen-handoff\.json/);
  assert.ok(manifest.assets.length >= 3);
  assert.equal(handoff.schema, 'frontend-design-boost-imagegen-handoff/v1');
  assert.equal(handoff.executionMode, 'codex-built-in-imagegen-handoff');
  assert.equal(handoff.requiresOpenAiApiKey, false);
  assert.equal(handoff.model, 'gpt-image-2');
  assert.equal(handoff.assets.length, manifest.assets.length);
  assert.match(handoffText, /built-in image_gen/);
  assert.match(handoffText, /CODEX_HOME\/generated_images/);
  assert.match(handoffText, /project-local asset paths/);
  assert.match(handoff.assets[0].finalAssetPath, /output\/imagegen\/frontend-design-boost/);
  assert.match(handoff.assets[0].prompt, /Page type:/);
  assert.match(handoffMarkdown, /# Frontend Design Boost Imagegen Handoff/);
  assert.match(handoffMarkdown, /built-in image_gen/);
  assert.match(handoffMarkdown, /does not require `OPENAI_API_KEY`/);
  assert.match(handoffMarkdown, /asset smoke/i);
  assert.equal(selection.schema, 'frontend-design-boost-asset-selection/v1');
  assert.match(selection.sourcePromptPack, /image-prompts\.json/);
  assert.match(selectionText, /implementationTargets/);
  assert.match(selectionText, /visual-direction/);
  assert.match(selectionText, /hero/);
  assert.match(selectionText, /empty-state/);
  assert.match(selectionText, /fallback/);
  assert.match(selectionText, /project-local/);
  assert.match(manifestText, /Visual Direction/);
  assert.match(manifestText, /Project Assets/);
  assert.match(manifestText, /Extraction Checklist/);
  assert.match(manifestText, /Screenshot QA/);
  assert.match(manifestText, /built-in-imagegen/);
  assert.match(manifestText, /cliFallbackEnvironmentRequirements/);
  assert.match(commands, /image_gen\.py/);
  assert.match(commands, /--dry-run/);
  assert.match(commands, /gpt-image-2/);
  assert.equal(jobs.schema, 'frontend-design-boost-image-generation-jobs/v1');
  assert.equal(jobs.model, 'gpt-image-2');
  assert.equal(jobs.transport, 'ccswitch');
  assert.equal(jobs.routeRole, 'cli-fallback');
  assert.deepEqual(jobs.environmentRequirements, ['OPENAI_API_KEY']);
  assert.equal(jobs.executionMode, 'approval-gated');
  assert.equal(jobs.jobs.length, manifest.assets.length);
  assert.match(jobsText, /imagegen-commands\.ps1/);
  assert.match(jobsText, /asset-selection\.json/);
  assert.match(jobsText, /status/);
  assert.match(jobsText, /dryRunCommand/);
  assert.match(jobs.jobs[0].prompt, /Page type:/);
  assert.match(jobs.jobs[0].outputPath, /output\/imagegen\/frontend-design-boost/);
  assert.ok(jobs.jobs[0].command.includes('gpt-image-2'));
  assert.ok(!jobs.jobs[0].command.includes('--dry-run'));
  assert.ok(jobs.jobs[0].dryRunCommand.includes('--dry-run'));
  assert.match(readme, /lab:frontend-design-boost:image/);
  assert.match(readme, /image-generation-jobs\.json/);
  assert.match(readme, /imagegen-handoff\.json/);
  assert.match(preview, /Prompt pack/);
  assert.match(preview, /Generation jobs/);
  assert.match(preview, /Built-in imagegen handoff/);
  assert.match(preview, /Extraction checklist/);
  assert.match(preview, /Screenshot QA/);
  assert.match(preview, /Built-in route: no OPENAI_API_KEY/);
  assert.match(preview, /CLI fallback: OPENAI_API_KEY/);
  assert.match(preview, /preview pending|generated/i);
  assert.match(preview, /asset-consumption-demo\.html/);
  assert.match(consumptionDemo, /Selected assets/);
  assert.match(consumptionDemo, /data-asset-slot="hero"/);
  assert.match(consumptionDemo, /data-asset-slot="empty-state"/);
  assert.match(consumptionDemo, /asset-fallback/);
  assert.match(consumptionDemo, /project-local asset paths/i);

  const qaOutDir = path.join(root, '.tmp/frontend-design-boost/test-image-pack-qa');
  execFileSync(process.execPath, [qaScriptPath, '--out-dir', qaOutDir], {
    cwd: root,
    encoding: 'utf8'
  });

  const qaReportPath = path.join(qaOutDir, 'qa-report.json');
  assert.equal(existsSync(qaReportPath), true);
  const qaReport = JSON.parse(readFileSync(qaReportPath, 'utf8'));
  assert.equal(qaReport.ok, true);
  assert.match(JSON.stringify(qaReport), /static by default/i);
  assert.match(JSON.stringify(qaReport), /browserScreenshots/);
  assert.match(JSON.stringify(qaReport), /brief profile extracted/);
  assert.match(JSON.stringify(qaReport), /image generation job manifest/);
  assert.match(JSON.stringify(qaReport), /built-in imagegen handoff/);
  assert.match(JSON.stringify(qaReport), /asset selection manifest/);
  assert.match(JSON.stringify(qaReport), /asset consumption demo/);

  const saasOutDir = path.join(root, '.tmp/frontend-design-boost/test-saas-image-prompt-pack');
  execFileSync(
    process.execPath,
    [
      qaScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--out-dir',
      saasOutDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );

  const saasManifest = JSON.parse(readFileSync(path.join(saasOutDir, 'image-prompts.json'), 'utf8'));
  const saasSelection = JSON.parse(readFileSync(path.join(saasOutDir, 'asset-selection.json'), 'utf8'));
  const saasPreview = readFileSync(path.join(saasOutDir, 'preview.html'), 'utf8');
  const saasConsumptionDemo = readFileSync(path.join(saasOutDir, 'asset-consumption-demo.html'), 'utf8');
  const saasReport = JSON.parse(readFileSync(path.join(saasOutDir, 'qa-report.json'), 'utf8'));
  const saasManifestText = JSON.stringify(saasManifest);
  const saasSelectionText = JSON.stringify(saasSelection);
  assert.match(saasManifest.title, /SaaS Ops Dashboard Brief/);
  assert.match(saasManifestText, /support and billing team/);
  assert.match(saasManifestText, /summary strip/);
  assert.match(saasManifestText, /prioritized action list/);
  assert.match(saasManifestText, /table or grid of accounts/);
  assert.match(saasManifestText, /small chart or trend block/);
  assert.match(saasManifestText, /Hover and focus states/);
  assert.match(saasPreview, /support and billing team/i);
  assert.match(saasPreview, /summary strip/i);
  assert.match(saasPreview, /prioritized action list/i);
  assert.match(saasSelectionText, /support and billing team/);
  assert.match(saasSelectionText, /summary strip/);
  assert.match(saasConsumptionDemo, /support and billing team/i);
  assert.match(saasConsumptionDemo, /selected assets/i);
  assert.equal(saasReport.ok, true);
  assert.match(JSON.stringify(saasReport), /support and billing team/);
});

test('frontend design boost prompt pack accepts external reference intake', () => {
  const scriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const qaScriptPath = path.join(root, 'scripts/frontend-design-boost-image-pack-qa.mjs');
  const briefPath = path.join(root, 'fixtures/frontend-design-boost/saas-dashboard-brief.md');
  const intakePath = path.join(root, 'fixtures/frontend-design-boost/reference-intake.md');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-reference-intake-pack');

  assert.equal(existsSync(intakePath), true);

  execFileSync(
    process.execPath,
    [
      scriptPath,
      '--brief',
      briefPath,
      '--reference-intake',
      intakePath,
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );

  const manifest = JSON.parse(readFileSync(path.join(outDir, 'image-prompts.json'), 'utf8'));
  const selection = JSON.parse(readFileSync(path.join(outDir, 'asset-selection.json'), 'utf8'));
  const jobs = JSON.parse(readFileSync(path.join(outDir, 'image-generation-jobs.json'), 'utf8'));
  const readme = readFileSync(path.join(outDir, 'README.md'), 'utf8');
  const preview = readFileSync(path.join(outDir, 'preview.html'), 'utf8');
  const manifestText = JSON.stringify(manifest);
  const selectionText = JSON.stringify(selection);
  const jobsText = JSON.stringify(jobs);

  assert.match(manifest.sourceReferenceIntake, /fixtures\/frontend-design-boost\/reference-intake\.md/);
  assert.equal(manifest.referenceProfile.enabled, true);
  assert.match(manifestText, /OCMacro Trump dashboard/);
  assert.match(manifestText, /shadcn\/ui dashboard block/);
  assert.match(manifestText, /chart-led first viewport/);
  assert.match(manifestText, /Do not copy/);
  assert.match(manifest.assets[0].prompt, /Reference intake:/);
  assert.match(selectionText, /reference intake/i);
  assert.match(jobsText, /reference intake/i);
  assert.match(jobsText, /OCMacro Trump dashboard/);
  assert.ok(jobs.jobs[0].command.includes('gpt-image-2'));
  assert.ok(jobs.jobs[0].dryRunCommand.includes('--dry-run'));
  assert.ok(Array.isArray(jobs.jobs[0].commandParts));
  assert.ok(Array.isArray(jobs.jobs[0].dryRunCommandParts));
  assert.ok(jobs.jobs[0].commandParts.includes('gpt-image-2'));
  assert.ok(jobs.jobs[0].dryRunCommandParts.includes('--dry-run'));
  assert.match(readme, /--reference-intake/);
  assert.match(preview, /Reference intake/);

  execFileSync(
    process.execPath,
    [
      qaScriptPath,
      '--brief',
      briefPath,
      '--reference-intake',
      intakePath,
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );

  const qaReport = JSON.parse(readFileSync(path.join(outDir, 'qa-report.json'), 'utf8'));
  assert.equal(qaReport.ok, true);
  assert.match(JSON.stringify(qaReport), /reference intake parsed/);
});

test('frontend design boost plans image generation jobs without executing them', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const planScriptPath = path.join(root, 'scripts/frontend-design-boost-image-jobs-plan.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-jobs-plan');

  assert.equal(
    packageJson.scripts?.['plan:frontend-design-boost:image-jobs'],
    'node scripts/frontend-design-boost-image-jobs-plan.mjs'
  );
  assert.equal(existsSync(planScriptPath), true);

  execFileSync(
    process.execPath,
    [
      assistScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--reference-intake',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );

  const jobsPath = path.join(outDir, 'image-generation-jobs.json');
  const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
  jobs.environmentRequirements = ['FRONTEND_DESIGN_BOOST_TEST_MISSING_KEY'];
  writeFileSync(jobsPath, `${JSON.stringify(jobs, null, 2)}\n`, 'utf8');

  const plan = JSON.parse(execFileSync(
    process.execPath,
    [
      planScriptPath,
      '--jobs',
      jobsPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        FRONTEND_DESIGN_BOOST_TEST_MISSING_KEY: ''
      }
    }
  ));

  assert.equal(plan.ok, true);
  assert.equal(plan.executed, false);
  assert.equal(plan.readyToRun, false);
  assert.equal(plan.jobCount, jobs.jobs.length);
  assert.match(JSON.stringify(plan), /FRONTEND_DESIGN_BOOST_TEST_MISSING_KEY/);
  assert.match(JSON.stringify(plan), /missing environment variable/);
  assert.match(JSON.stringify(plan), /dryRunCommands/);
  assert.match(JSON.stringify(plan), /executableCommands/);
  assert.match(plan.dryRunCommands[0], /--dry-run/);
  assert.doesNotMatch(plan.executableCommands[0], /--dry-run/);
});

test('frontend design boost exposes an approval-gated image job runner', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const runScriptPath = path.join(root, 'scripts/frontend-design-boost-image-jobs-run.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-jobs-run');

  assert.equal(
    packageJson.scripts?.['run:frontend-design-boost:image-job'],
    'node scripts/frontend-design-boost-image-jobs-run.mjs'
  );
  assert.equal(existsSync(runScriptPath), true);

  execFileSync(
    process.execPath,
    [
      assistScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--reference-intake',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );

  const jobsPath = path.join(outDir, 'image-generation-jobs.json');
  const jobs = JSON.parse(readFileSync(jobsPath, 'utf8'));
  const firstJob = jobs.jobs[0];
  const previewReportPath = path.join(outDir, 'runner-preview-report.json');

  assert.ok(Array.isArray(firstJob.commandParts));
  assert.ok(Array.isArray(firstJob.dryRunCommandParts));
  assert.equal(firstJob.commandParts.includes('gpt-image-2'), true);
  assert.equal(firstJob.dryRunCommandParts.includes('--dry-run'), true);
  assert.equal(firstJob.commandParts.includes('--dry-run'), false);

  const previewReport = JSON.parse(execFileSync(
    process.execPath,
    [
      runScriptPath,
      '--jobs',
      jobsPath,
      '--job',
      firstJob.id
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        OPENAI_API_KEY: ''
      }
    }
  ));

  const previewText = JSON.stringify(previewReport);
  assert.equal(previewReport.schema, 'frontend-design-boost-image-job-run/v1');
  assert.equal(previewReport.executed, false);
  assert.equal(previewReport.applyRequired, true);
  assert.equal(previewReport.selectedJob.id, firstJob.id);
  assert.match(previewReport.nextCommand, /--dry-run/);
  assert.ok(Array.isArray(previewReport.commandParts));
  assert.ok(Array.isArray(previewReport.dryRunCommandParts));
  assert.deepEqual(previewReport.commandParts, firstJob.commandParts);
  assert.deepEqual(previewReport.dryRunCommandParts, firstJob.dryRunCommandParts);
  assert.doesNotMatch(previewText, /missing environment variable/);

  const writtenPreviewReport = JSON.parse(execFileSync(
    process.execPath,
    [
      runScriptPath,
      '--jobs',
      jobsPath,
      '--job',
      firstJob.id,
      '--report',
      previewReportPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        OPENAI_API_KEY: ''
      }
    }
  ));

  assert.equal(writtenPreviewReport.reportPath, path.relative(root, previewReportPath).split(path.sep).join('/'));
  assert.equal(existsSync(previewReportPath), true);
  const reportFile = JSON.parse(readFileSync(previewReportPath, 'utf8'));
  assert.equal(reportFile.schema, 'frontend-design-boost-image-job-run/v1');
  assert.equal(reportFile.selectedJob.id, firstJob.id);
  assert.equal(reportFile.executed, false);
  assert.equal(reportFile.mode, 'dry-run');

  let applyFailure = null;
  try {
    execFileSync(
      process.execPath,
      [
        runScriptPath,
        '--jobs',
        jobsPath,
        '--job',
        firstJob.id,
        '--apply'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          OPENAI_API_KEY: ''
        }
      }
    );
  } catch (error) {
    applyFailure = error;
  }

  assert.ok(applyFailure);
  assert.match(String(applyFailure.stdout ?? ''), /missing environment variable/);
  assert.match(String(applyFailure.stdout ?? ''), /OPENAI_API_KEY/);
});

test('frontend design boost exposes a no-execution image workflow orchestrator', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const workflowScriptPath = path.join(root, 'scripts/frontend-design-boost-image-workflow.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-workflow');

  assert.equal(
    packageJson.scripts?.['flow:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-workflow.mjs'
  );
  assert.equal(existsSync(workflowScriptPath), true);

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      workflowScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--reference-intake',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      outDir,
      '--job',
      'visual-direction-1'
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        OPENAI_API_KEY: ''
      }
    }
  ));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-image-workflow/v1');
  assert.equal(report.executed, false);
  assert.equal(report.applyRequired, true);
  assert.equal(report.promptPack.outDir, '.tmp/frontend-design-boost/test-image-workflow');
  assert.match(report.promptPack.generationJobsPath, /image-generation-jobs\.json/);
  assert.match(report.promptPack.assetSelectionPath, /asset-selection\.json/);
  assert.match(report.promptPack.assetConsumptionDemoPath, /asset-consumption-demo\.html/);
  assert.equal(report.jobPlan.executed, false);
  assert.equal(report.jobPlan.readyToRun, false);
  assert.equal(report.jobRun.executed, false);
  assert.equal(report.jobRun.selectedJob.id, 'visual-direction-1');
  assert.match(report.jobRun.nextCommand, /--dry-run/);
  assert.equal(report.assetIntake.schema, 'frontend-design-boost-asset-intake/v1');
  assert.equal(report.assetIntake.executed, false);
  assert.match(report.assetIntake.markdownPath, /asset-intake\.md/);
  assert.equal(report.assetDecision.schema, 'frontend-design-boost-image-decision/v1');
  assert.equal(report.assetDecision.executed, false);
  assert.match(report.assetDecision.markdownPath, /image-decision\.md/);
  assert.match(reportText, /Visual Decision Matrix/);
  assert.match(reportText, /reference intake/i);
  assert.match(reportText, /approval-gated/);

  let applyFailure = null;
  try {
    execFileSync(
      process.execPath,
      [
        workflowScriptPath,
        '--brief',
        'fixtures/frontend-design-boost/saas-dashboard-brief.md',
        '--reference-intake',
        'fixtures/frontend-design-boost/reference-intake.md',
        '--out-dir',
        path.join(root, '.tmp/frontend-design-boost/test-image-workflow-apply'),
        '--job',
        'visual-direction-1',
        '--apply'
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          OPENAI_API_KEY: ''
        }
      }
    );
  } catch (error) {
    applyFailure = error;
  }

  assert.ok(applyFailure);
  const failureReport = JSON.parse(String(applyFailure.stdout ?? ''));
  const failureText = JSON.stringify(failureReport);
  assert.equal(failureReport.schema, 'frontend-design-boost-image-workflow/v1');
  assert.equal(failureReport.executed, false);
  assert.equal(failureReport.applyRequired, false);
  assert.equal(failureReport.jobRun.executed, false);
  assert.equal(failureReport.assetIntake.schema, 'frontend-design-boost-asset-intake/v1');
  assert.equal(failureReport.assetDecision.schema, 'frontend-design-boost-image-decision/v1');
  assert.match(failureText, /missing environment variable/);
  assert.match(failureText, /OPENAI_API_KEY/);
});

test('frontend design boost exposes an image workflow acceptance report', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const syncScriptPath = path.join(root, 'scripts/frontend-design-boost-skill-sync.mjs');
  const acceptanceScriptPath = path.join(root, 'scripts/frontend-design-boost-image-acceptance.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-image-acceptance');
  const installedSkillPath = path.join(outDir, 'installed-skill');
  const currentInstalledSkillPath = path.join(outDir, 'current-installed-skill');

  assert.equal(
    packageJson.scripts?.['acceptance:frontend-design-boost:image'],
    'node scripts/frontend-design-boost-image-acceptance.mjs'
  );
  assert.equal(existsSync(acceptanceScriptPath), true);

  mkdirSync(installedSkillPath, { recursive: true });
  writeFileSync(path.join(installedSkillPath, 'SKILL.md'), '# stale installed skill\n', 'utf8');

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      acceptanceScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--reference-intake',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      outDir,
      '--installed-skill',
      installedSkillPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        OPENAI_API_KEY: ''
      }
    }
  ));

  const reportText = JSON.stringify(report);
  assert.equal(report.schema, 'frontend-design-boost-image-acceptance/v1');
  assert.equal(report.executed, false);
  assert.equal(report.readyForLiveGeneration, false);
  assert.equal(report.workflow.schema, 'frontend-design-boost-image-workflow/v1');
  assert.equal(report.workflow.executed, false);
  assert.equal(report.promptPackQa.ok, true);
  assert.equal(report.installedSkill.ready, false);
  assert.match(reportText, /missing environment variable/);
  assert.match(reportText, /OPENAI_API_KEY/);
  assert.match(reportText, /installed skill is stale/i);
  assert.match(reportText, /asset-intake-report\.json/);
  assert.match(reportText, /approval-gated/);

  execFileSync(process.execPath, [
    syncScriptPath,
    '--installed-skill',
    currentInstalledSkillPath,
    '--apply'
  ], {
    cwd: root,
    encoding: 'utf8'
  });

  const readyReport = JSON.parse(execFileSync(
    process.execPath,
    [
      acceptanceScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--reference-intake',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      path.join(outDir, 'built-in-ready'),
      '--installed-skill',
      currentInstalledSkillPath
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        OPENAI_API_KEY: ''
      }
    }
  ));

  assert.equal(readyReport.readyForBuiltInImagegenHandoff, true);
  assert.equal(readyReport.readyForLiveGeneration, true);
  assert.equal(readyReport.readyForCliLiveGeneration, false);
  assert.equal(readyReport.blockers.length, 0);
  assert.match(JSON.stringify(readyReport.cliFallbackBlockers), /OPENAI_API_KEY/);
  assert.match(JSON.stringify(readyReport.nextSteps), /imagegen-handoff\.json/);
});

test('frontend design boost audits gpt-image workflow readiness without executing generation', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readme = readText('docs/frontend-design-boost/README.md');
  const assistScriptPath = path.join(root, 'scripts/frontend-design-boost-image-assist.mjs');
  const auditScriptPath = path.join(root, 'scripts/frontend-design-boost-goal-audit.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-goal-audit');
  const installedSkillPath = path.join(outDir, 'installed-skill');
  const productDesignPluginRoot = path.join(outDir, 'product-design-plugin/product-design/0.1.43');

  assert.equal(
    packageJson.scripts?.['audit:frontend-design-boost:goal'],
    'node scripts/frontend-design-boost-goal-audit.mjs'
  );
  assert.equal(existsSync(auditScriptPath), true);
  assert.match(readme, /audit:frontend-design-boost:goal/);

  execFileSync(
    process.execPath,
    [
      assistScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--reference-intake',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  );

  mkdirSync(installedSkillPath, { recursive: true });
  writeFileSync(path.join(installedSkillPath, 'SKILL.md'), '# stale installed skill\n', 'utf8');
  mkdirSync(path.join(productDesignPluginRoot, '.codex-plugin'), { recursive: true });
  writeFileSync(
    path.join(productDesignPluginRoot, '.codex-plugin/plugin.json'),
    JSON.stringify({
      name: 'product-design',
      version: '0.1.43',
      skills: './skills/'
    }),
    'utf8'
  );
  for (const skillName of [
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
  ]) {
    const skillDir = path.join(productDesignPluginRoot, 'skills', skillName);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: ${skillName}\n---\n# ${skillName}\n`, 'utf8');
  }

  const audit = JSON.parse(execFileSync(
    process.execPath,
    [
      auditScriptPath,
      '--jobs',
      path.join(outDir, 'image-generation-jobs.json'),
      '--installed-skill',
      installedSkillPath,
      '--product-design-plugin-root',
      productDesignPluginRoot
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        OPENAI_API_KEY: ''
      }
    }
  ));

  const auditText = JSON.stringify(audit);
  assert.equal(audit.schema, 'frontend-design-boost-goal-audit/v1');
  assert.equal(audit.executed, false);
  assert.equal(audit.repoReady, true);
  assert.equal(audit.goalComplete, false);
  assert.equal(audit.imageGeneration.readyToRun, false);
  assert.equal(audit.imageGeneration.routeRole, 'cli-fallback');
  assert.equal(audit.routeReadiness.defaultRouteSatisfied, false);
  assert.equal(audit.routeReadiness.cliFallbackRequired, false);
  assert.equal(audit.productDesignBridge.readyForBridge, true);
  assert.equal(audit.productDesignBridge.pluginCache.version, '0.1.43');
  assert.deepEqual(audit.productDesignBridge.missingCoreSkills, []);
  assert.match(auditText, /prompt pack/i);
  assert.match(auditText, /image job runner/i);
  assert.match(auditText, /image workflow orchestrator/i);
  assert.match(auditText, /image workflow acceptance/i);
  assert.match(auditText, /image workflow decision/i);
  assert.match(auditText, /image workflow evidence/i);
  assert.match(auditText, /built-in imagegen import/i);
  assert.match(auditText, /built-in imagegen acceptance/i);
  assert.match(auditText, /built-in imagegen provenance/i);
  assert.match(auditText, /asset intake report/i);
  assert.match(auditText, /installed skill readiness/i);
  assert.match(auditText, /reference bank/i);
  assert.match(auditText, /visual QA checklist/i);
  assert.match(auditText, /companion-skill routing/i);
  assert.match(auditText, /Product Design plugin bridge/i);
  assert.match(auditText, /Product Design task brief preflight/i);
  assert.match(auditText, /@Product Design/);
  assert.match(auditText, /No Visual Target, No Build/i);
  assert.match(auditText, /installed skill sync requires explicit approval/i);
  assert.match(auditText, /live gpt-image-2 generation evidence has not been verified/i);
  assert.match(auditText, /OPENAI_API_KEY/);
  assert.doesNotMatch(JSON.stringify(audit.blockedBy), /image-generation-readiness/);
  assert.match(audit.imageGeneration.dryRunCommands[0], /--dry-run/);
  assert.doesNotMatch(audit.imageGeneration.executableCommands[0], /--dry-run/);
  assert.equal(
    audit.commandArtifacts.productDesignBridgeReadiness,
    'npm.cmd run readiness:frontend-design-boost:product-design'
  );
  assert.equal(
    audit.commandArtifacts.productDesignTaskBrief,
    'npm.cmd run brief:frontend-design-boost:product-design'
  );
});

test('frontend design boost documents local QA gate candidates', () => {
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const qaGatePath = path.join(root, 'docs/frontend-design-boost/qa-gate-candidates.md');

  assert.equal(existsSync(qaGatePath), true);

  const qaGate = readText('docs/frontend-design-boost/qa-gate-candidates.md');
  assert.match(readme, /qa-gate-candidates\.md/);
  assert.match(referenceBank, /QA gate candidates/i);
  assert.match(skill, /qa-gate-candidates\.md/);
  assert.match(driftScript, /qa-gate-candidates\.md/);
  assert.match(qaGate, /Storybook/);
  assert.match(qaGate, /axe-core/);
  assert.match(qaGate, /@axe-core\/playwright/);
  assert.match(qaGate, /No external service/i);
  assert.match(qaGate, /Do Not Install Yet/i);
  assert.match(qaGate, /Acceptance Gate/i);
  assert.match(qaGate, /Manual Checks Still Required/i);
});

test('frontend design boost localizes Vercel agent-skills React review gaps', () => {
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const guidePath = path.join(root, 'docs/frontend-design-boost/react-performance-composition-checks.md');

  assert.equal(existsSync(guidePath), true);

  const guide = readText('docs/frontend-design-boost/react-performance-composition-checks.md');
  assert.match(readme, /react-performance-composition-checks\.md/);
  assert.match(referenceBank, /React performance and composition checks/i);
  assert.match(referenceBank, /vercel-labs\/agent-skills/);
  assert.match(skill, /react-performance-composition-checks\.md/);
  assert.match(driftScript, /react-performance-composition-checks\.md/);

  assert.match(guide, /vercel-labs\/agent-skills/);
  assert.match(guide, /react-best-practices/);
  assert.match(guide, /web-design-guidelines/);
  assert.match(guide, /composition-patterns/);
  assert.match(guide, /Do Not Install Wholesale/);
  assert.match(guide, /async-parallel/);
  assert.match(guide, /bundle-barrel-imports/);
  assert.match(guide, /server-no-shared-module-state/);
  assert.match(guide, /architecture-avoid-boolean-props/);
  assert.match(guide, /accessibility/i);
  assert.match(guide, /Screenshot QA/);
});

test('frontend design boost localizes Vercel dev3000 and json-render as a debug evidence contract', () => {
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const guidePath = path.join(root, 'docs/frontend-design-boost/frontend-debug-evidence-bundle.md');

  assert.equal(existsSync(guidePath), true);

  const guide = readText('docs/frontend-design-boost/frontend-debug-evidence-bundle.md');
  assert.match(readme, /frontend-debug-evidence-bundle\.md/);
  assert.match(referenceBank, /Frontend debug evidence bundle/i);
  assert.match(referenceBank, /vercel-labs\/dev3000/);
  assert.match(referenceBank, /vercel-labs\/json-render/);
  assert.match(skill, /frontend-debug-evidence-bundle\.md/);
  assert.match(driftScript, /frontend-debug-evidence-bundle\.md/);

  assert.match(guide, /vercel-labs\/dev3000/);
  assert.match(guide, /vercel-labs\/json-render/);
  assert.match(guide, /Do Not Install Wholesale/);
  assert.match(guide, /frontend_debug_evidence_bundle\/v1/);
  assert.match(guide, /timeline/);
  assert.match(guide, /server_log/);
  assert.match(guide, /browser_console/);
  assert.match(guide, /network_request/);
  assert.match(guide, /screenshot/);
  assert.match(guide, /component_catalog/);
  assert.match(guide, /action_catalog/);
  assert.match(guide, /Browser\/Playwright/);
});

test('frontend design boost exposes a Product Design plugin bridge readiness gate', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const readinessScript = readText('scripts/frontend-design-boost-skill-readiness.mjs');
  const bridgeDocPath = path.join(root, 'docs/frontend-design-boost/product-design-plugin-bridge.md');
  const bridgeScriptPath = path.join(root, 'scripts/frontend-design-boost-product-design-readiness.mjs');
  const pluginRoot = path.join(root, '.tmp/frontend-design-boost/test-product-design-plugin/product-design/0.1.43');

  assert.equal(
    packageJson.scripts?.['readiness:frontend-design-boost:product-design'],
    'node scripts/frontend-design-boost-product-design-readiness.mjs'
  );
  assert.equal(existsSync(bridgeDocPath), true);
  assert.equal(existsSync(bridgeScriptPath), true);

  const guide = readText('docs/frontend-design-boost/product-design-plugin-bridge.md');
  assert.match(readme, /product-design-plugin-bridge\.md/);
  assert.match(readme, /readiness:frontend-design-boost:product-design/);
  assert.match(referenceBank, /Product Design plugin bridge/i);
  assert.match(referenceBank, /openai-curated-remote\/product-design/);
  assert.match(skill, /product-design-plugin-bridge\.md/);
  assert.match(driftScript, /product-design-plugin-bridge\.md/);
  assert.match(readinessScript, /product-design-plugin-bridge\.md/);

  assert.match(guide, /@Product Design/);
  assert.match(guide, /get-context/);
  assert.match(guide, /ideate/);
  assert.match(guide, /prototype/);
  assert.match(guide, /url-to-code/);
  assert.match(guide, /image-to-code/);
  assert.match(guide, /audit/);
  assert.match(guide, /design-qa/);
  assert.match(guide, /No Visual Target, No Build/);
  assert.match(guide, /design-qa\.md/);
  assert.match(guide, /fallback/i);

  mkdirSync(path.join(pluginRoot, '.codex-plugin'), { recursive: true });
  writeFileSync(
    path.join(pluginRoot, '.codex-plugin/plugin.json'),
    JSON.stringify({
      name: 'product-design',
      version: '0.1.43',
      skills: './skills/'
    }),
    'utf8'
  );
  for (const skillName of [
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
  ]) {
    const skillDir = path.join(pluginRoot, 'skills', skillName);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: ${skillName}\n---\n# ${skillName}\n`, 'utf8');
  }

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      bridgeScriptPath,
      '--plugin-root',
      pluginRoot
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));
  const reportText = JSON.stringify(report);

  assert.equal(report.schema, 'frontend-design-boost-product-design-readiness/v1');
  assert.equal(report.ok, true);
  assert.equal(report.executed, false);
  assert.equal(report.pluginCache.detected, true);
  assert.equal(report.pluginCache.version, '0.1.43');
  assert.deepEqual(report.missingCoreSkills, []);
  assert.equal(report.currentSession.callableAssumed, false);
  assert.match(reportText, /@Product Design/);
  assert.match(reportText, /get-context/);
  assert.match(reportText, /design-qa/);
  assert.match(reportText, /frontend-design-boost fallback/i);
});

test('frontend design boost can generate a Product Design task brief preflight', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const readinessScript = readText('scripts/frontend-design-boost-skill-readiness.mjs');
  const bridgeDoc = readText('docs/frontend-design-boost/product-design-plugin-bridge.md');
  const briefScriptPath = path.join(root, 'scripts/frontend-design-boost-product-design-brief.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-product-design-brief');
  const pluginRoot = path.join(outDir, 'product-design-plugin/product-design/0.1.43');

  assert.equal(
    packageJson.scripts?.['brief:frontend-design-boost:product-design'],
    'node scripts/frontend-design-boost-product-design-brief.mjs'
  );
  assert.equal(existsSync(briefScriptPath), true);
  assert.match(readme, /brief:frontend-design-boost:product-design/);
  assert.match(referenceBank, /Product Design task brief preflight/i);
  assert.match(skill, /brief:frontend-design-boost:product-design/);
  assert.match(driftScript, /frontend-design-boost-product-design-brief\.mjs/);
  assert.match(readinessScript, /frontend-design-boost-product-design-brief\.mjs/);
  assert.match(bridgeDoc, /Product Design Task Brief Preflight/);

  mkdirSync(path.join(pluginRoot, '.codex-plugin'), { recursive: true });
  writeFileSync(
    path.join(pluginRoot, '.codex-plugin/plugin.json'),
    JSON.stringify({
      name: 'product-design',
      version: '0.1.43',
      skills: './skills/'
    }),
    'utf8'
  );
  for (const skillName of [
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
  ]) {
    const skillDir = path.join(pluginRoot, 'skills', skillName);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(path.join(skillDir, 'SKILL.md'), `---\nname: ${skillName}\n---\n# ${skillName}\n`, 'utf8');
  }

  const ideationReport = JSON.parse(execFileSync(
    process.execPath,
    [
      briefScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--task-kind',
      'prototype',
      '--interactivity',
      'full',
      '--out-dir',
      outDir,
      '--plugin-root',
      pluginRoot
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(ideationReport.schema, 'frontend-design-boost-product-design-brief/v1');
  assert.equal(ideationReport.ok, true);
  assert.equal(ideationReport.externalActionsExecuted, false);
  assert.equal(ideationReport.productDesignBridge.readyForBridge, true);
  assert.equal(ideationReport.productDesignBridge.currentSession.callableAssumed, false);
  assert.equal(ideationReport.routeDecision.firstPluginSkill, 'get-context');
  assert.equal(ideationReport.routeDecision.recommendedPluginSkill, 'ideate');
  assert.equal(ideationReport.routeDecision.noVisualTargetGate, true);
  assert.equal(ideationReport.routeDecision.readyForImplementation, false);
  assert.match(JSON.stringify(ideationReport), /No Visual Target, No Build/);
  assert.match(JSON.stringify(ideationReport), /flow:frontend-design-boost:image/);
  assert.equal(existsSync(path.join(outDir, 'product-design-task-brief.json')), true);
  assert.equal(existsSync(path.join(outDir, 'product-design-task-brief.md')), true);
  assert.match(readText('.tmp/frontend-design-boost/test-product-design-brief/product-design-task-brief.md'), /Product Design Task Brief/);

  const urlReport = JSON.parse(execFileSync(
    process.execPath,
    [
      briefScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--visual-source',
      'https://example.com/dashboard',
      '--task-kind',
      'prototype',
      '--interactivity',
      'full',
      '--out-dir',
      path.join(outDir, 'url-source'),
      '--plugin-root',
      pluginRoot
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(urlReport.routeDecision.recommendedPluginSkill, 'url-to-code');
  assert.equal(urlReport.routeDecision.noVisualTargetGate, false);
  assert.equal(urlReport.routeDecision.readyForImplementation, true);
  assert.equal(urlReport.routeDecision.designQaRequired, true);
  assert.match(JSON.stringify(urlReport.evidenceRequirements), /desktop source screenshot/);
  assert.match(JSON.stringify(urlReport.evidenceRequirements), /mobile source screenshot/);
  assert.match(JSON.stringify(urlReport.handoffRequirements), /design-qa\.md/);
});

test('frontend design boost can scaffold and validate Product Design ideation reports', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const readinessScript = readText('scripts/frontend-design-boost-skill-readiness.mjs');
  const bridgeDoc = readText('docs/frontend-design-boost/product-design-plugin-bridge.md');
  const goalAuditScript = readText('scripts/frontend-design-boost-goal-audit.mjs');
  const ideateScriptPath = path.join(root, 'scripts/frontend-design-boost-product-design-ideate.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-product-design-ideate');

  assert.equal(
    packageJson.scripts?.['ideate:frontend-design-boost:product-design'],
    'node scripts/frontend-design-boost-product-design-ideate.mjs'
  );
  assert.equal(existsSync(ideateScriptPath), true);
  assert.match(readme, /ideate:frontend-design-boost:product-design/);
  assert.match(referenceBank, /Product Design ideation scaffold/i);
  assert.match(skill, /ideate:frontend-design-boost:product-design/);
  assert.match(driftScript, /frontend-design-boost-product-design-ideate\.mjs/);
  assert.match(readinessScript, /frontend-design-boost-product-design-ideate\.mjs/);
  assert.match(bridgeDoc, /Product Design Ideation Scaffold/);
  assert.match(goalAuditScript, /product-design-ideation-scaffold/);

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      ideateScriptPath,
      '--brief',
      'fixtures/frontend-design-boost/saas-dashboard-brief.md',
      '--surface-type',
      'desktop-dashboard',
      '--mode',
      'broad-exploration',
      '--reference',
      'fixtures/frontend-design-boost/reference-intake.md',
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(report.schema, 'frontend-design-boost-product-design-ideate/v1');
  assert.equal(report.ok, true);
  assert.equal(report.externalActionsExecuted, false);
  assert.equal(report.mode, 'scaffold');
  assert.equal(report.finalResult, 'blocked');
  assert.equal(report.readyForImageGeneration, true);
  assert.equal(report.readyForSelection, false);
  assert.equal(report.buildGate.noBuildBeforeSelection, true);
  assert.equal(report.targetDimensions, '1440x1024');
  assert.equal(report.conceptDirections.length, 3);
  assert.match(JSON.stringify(report.conceptDirections), /Create realistic, production-quality UI designs/);
  assert.match(JSON.stringify(report.blockers), /three independent images have not been generated/i);
  assert.equal(existsSync(path.join(outDir, 'product-design-ideation.md')), true);
  assert.equal(existsSync(path.join(outDir, 'product-design-ideation-report.json')), true);

  const ideation = readText('.tmp/frontend-design-boost/test-product-design-ideate/product-design-ideation.md');
  assert.match(ideation, /Three Independent Directions/i);
  assert.match(ideation, /Image Gen Prompt Seeds/i);
  assert.match(ideation, /Selection Gate/i);
  assert.match(ideation, /Build Gate/i);
  assert.match(ideation, /Evidence Limits/i);
  assert.match(ideation, /final result: blocked/);

  const checkReport = JSON.parse(execFileSync(
    process.execPath,
    [
      ideateScriptPath,
      '--check',
      path.join(outDir, 'product-design-ideation.md')
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(checkReport.mode, 'check');
  assert.equal(checkReport.valid, true);
  assert.equal(checkReport.finalResult, 'blocked');
  assert.equal(checkReport.readyForSelection, false);
  assert.deepEqual(checkReport.missingFields, []);
});

test('frontend design boost can scaffold and validate Product Design design QA reports', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const readinessScript = readText('scripts/frontend-design-boost-skill-readiness.mjs');
  const bridgeDoc = readText('docs/frontend-design-boost/product-design-plugin-bridge.md');
  const goalAuditScript = readText('scripts/frontend-design-boost-goal-audit.mjs');
  const qaScriptPath = path.join(root, 'scripts/frontend-design-boost-product-design-qa.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-product-design-qa');

  assert.equal(
    packageJson.scripts?.['design-qa:frontend-design-boost:product-design'],
    'node scripts/frontend-design-boost-product-design-qa.mjs'
  );
  assert.equal(existsSync(qaScriptPath), true);
  assert.match(readme, /design-qa:frontend-design-boost:product-design/);
  assert.match(referenceBank, /Product Design design QA scaffold/i);
  assert.match(skill, /design-qa:frontend-design-boost:product-design/);
  assert.match(driftScript, /frontend-design-boost-product-design-qa\.mjs/);
  assert.match(readinessScript, /frontend-design-boost-product-design-qa\.mjs/);
  assert.match(bridgeDoc, /Product Design Design QA Scaffold/);
  assert.match(goalAuditScript, /product-design-qa-scaffold/);

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      qaScriptPath,
      '--source',
      'fixtures/frontend-design-boost/research-dashboard-demo.html',
      '--implementation',
      'fixtures/frontend-design-boost/dashboard-demo.html',
      '--viewport',
      '1440x900',
      '--state',
      'default',
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(report.schema, 'frontend-design-boost-product-design-qa/v1');
  assert.equal(report.ok, true);
  assert.equal(report.externalActionsExecuted, false);
  assert.equal(report.mode, 'scaffold');
  assert.equal(report.finalResult, 'blocked');
  assert.equal(report.readyForHandoff, false);
  assert.match(JSON.stringify(report.blockers), /visual comparison has not been performed/i);
  assert.equal(existsSync(path.join(outDir, 'design-qa.md')), true);
  assert.equal(existsSync(path.join(outDir, 'design-qa-report.json')), true);

  const designQa = readText('.tmp/frontend-design-boost/test-product-design-qa/design-qa.md');
  assert.match(designQa, /source visual truth path/i);
  assert.match(designQa, /implementation screenshot path/i);
  assert.match(designQa, /full-view comparison evidence/i);
  assert.match(designQa, /focused region comparison evidence/i);
  assert.match(designQa, /fonts and typography/i);
  assert.match(designQa, /spacing and layout rhythm/i);
  assert.match(designQa, /colors and visual tokens/i);
  assert.match(designQa, /image quality and asset fidelity/i);
  assert.match(designQa, /copy and content/i);
  assert.match(designQa, /final result: blocked/);

  const checkReport = JSON.parse(execFileSync(
    process.execPath,
    [
      qaScriptPath,
      '--check',
      path.join(outDir, 'design-qa.md')
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(checkReport.mode, 'check');
  assert.equal(checkReport.valid, true);
  assert.equal(checkReport.finalResult, 'blocked');
  assert.equal(checkReport.readyForHandoff, false);
  assert.deepEqual(checkReport.missingFields, []);
});

test('frontend design boost can scaffold and validate Product Design flow audits', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const readme = readText('docs/frontend-design-boost/README.md');
  const referenceBank = readText('docs/frontend-design-boost/reference-bank.md');
  const skill = readText('docs/frontend-design-boost/skill/frontend-design-boost/SKILL.md');
  const driftScript = readText('scripts/frontend-design-boost-skill-drift.mjs');
  const readinessScript = readText('scripts/frontend-design-boost-skill-readiness.mjs');
  const bridgeDoc = readText('docs/frontend-design-boost/product-design-plugin-bridge.md');
  const goalAuditScript = readText('scripts/frontend-design-boost-goal-audit.mjs');
  const auditScriptPath = path.join(root, 'scripts/frontend-design-boost-product-design-audit.mjs');
  const outDir = path.join(root, '.tmp/frontend-design-boost/test-product-design-audit');

  assert.equal(
    packageJson.scripts?.['audit:frontend-design-boost:product-design'],
    'node scripts/frontend-design-boost-product-design-audit.mjs'
  );
  assert.equal(existsSync(auditScriptPath), true);
  assert.match(readme, /audit:frontend-design-boost:product-design/);
  assert.match(referenceBank, /Product Design flow audit scaffold/i);
  assert.match(skill, /audit:frontend-design-boost:product-design/);
  assert.match(driftScript, /frontend-design-boost-product-design-audit\.mjs/);
  assert.match(readinessScript, /frontend-design-boost-product-design-audit\.mjs/);
  assert.match(bridgeDoc, /Product Design Flow Audit Scaffold/);
  assert.match(goalAuditScript, /product-design-flow-audit/);

  const report = JSON.parse(execFileSync(
    process.execPath,
    [
      auditScriptPath,
      '--surface',
      'fixtures/frontend-design-boost/research-dashboard-demo.html',
      '--flow',
      'triage research dashboard',
      '--steps',
      'Open dashboard;Inspect priority signals;Review evidence timeline',
      '--destination',
      'local-folder',
      '--out-dir',
      outDir
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(report.schema, 'frontend-design-boost-product-design-audit/v1');
  assert.equal(report.ok, true);
  assert.equal(report.externalActionsExecuted, false);
  assert.equal(report.mode, 'scaffold');
  assert.equal(report.finalResult, 'blocked');
  assert.equal(report.readyForHandoff, false);
  assert.equal(report.steps.length, 3);
  assert.match(JSON.stringify(report.blockers), /screenshots have not been captured/i);
  assert.equal(existsSync(path.join(outDir, 'product-design-audit.md')), true);
  assert.equal(existsSync(path.join(outDir, 'product-design-audit-report.json')), true);

  const audit = readText('.tmp/frontend-design-boost/test-product-design-audit/product-design-audit.md');
  assert.match(audit, /Numbered Step List/i);
  assert.match(audit, /Screenshot Evidence/i);
  assert.match(audit, /UX and Design Findings/i);
  assert.match(audit, /Accessibility Risks/i);
  assert.match(audit, /Evidence Limits/i);
  assert.match(audit, /general health/i);
  assert.match(audit, /final result: blocked/);

  const checkReport = JSON.parse(execFileSync(
    process.execPath,
    [
      auditScriptPath,
      '--check',
      path.join(outDir, 'product-design-audit.md')
    ],
    {
      cwd: root,
      encoding: 'utf8'
    }
  ));

  assert.equal(checkReport.mode, 'check');
  assert.equal(checkReport.valid, true);
  assert.equal(checkReport.finalResult, 'blocked');
  assert.equal(checkReport.readyForHandoff, false);
  assert.deepEqual(checkReport.missingFields, []);
});

test('frontend design boost exposes an OCMacro-style research dashboard demo fixture', () => {
  const packageJson = JSON.parse(readText('package.json'));
  const researchHtmlPath = path.join(root, 'fixtures/frontend-design-boost/research-dashboard-demo.html');
  const researchStatesPath = path.join(
    root,
    'fixtures/frontend-design-boost/research-dashboard-demo.states.json'
  );
  const researchBrief = readText('fixtures/frontend-design-boost/research-dashboard-brief.md');
  const researchHtml = readText('fixtures/frontend-design-boost/research-dashboard-demo.html');
  const qaScript = readText('scripts/frontend-design-boost-fixture-qa.mjs');

  assert.equal(existsSync(researchHtmlPath), true);
  assert.equal(existsSync(researchStatesPath), true);
  assert.equal(
    packageJson.scripts?.['qa:frontend-design-boost:research'],
    'node scripts/frontend-design-boost-fixture-qa.mjs --html fixtures/frontend-design-boost/research-dashboard-demo.html'
  );
  assert.match(researchBrief, /chart-led research dashboard/i);
  assert.match(researchBrief, /threat, drawdown, and meaning/i);
  assert.match(researchHtml, /Research Signals Desk/);
  assert.match(researchHtml, /TACO pressure index/);
  assert.match(researchHtml, /Threat \/ Drawdown \/ Meaning/);
  assert.match(researchHtml, /Truths tracker/i);
  assert.match(qaScript, /stateConfigPath/);
  assert.match(qaScript, /\.states\.json/);
});

test('dashboard demo keeps panel and card radii within the pack limit', () => {
  const html = readText('fixtures/frontend-design-boost/dashboard-demo.html');
  const radiusMatches = [...html.matchAll(/(?:--radius-[\w-]+:\s*|border-radius:\s*)(\d+)px/g)]
    .map((match) => Number(match[1]));
  const excessiveRadii = radiusMatches.filter((radius) => radius > 8 && radius !== 999);

  assert.deepEqual(excessiveRadii, []);
});

test('dashboard demo and brief cover all required interaction and data states', () => {
  const html = readText('fixtures/frontend-design-boost/dashboard-demo.html');
  const brief = readText('fixtures/frontend-design-boost/saas-dashboard-brief.md');

  assert.match(html, /button:hover/);
  assert.match(html, /button:focus-visible/);
  assert.match(html, /button:active/);
  assert.match(html, /button:disabled/);
  assert.match(html, /\bdisabled\b/);
  assert.match(html, /Loading billing feed/);
  assert.match(html, /No urgent items/);
  assert.match(html, /Sync failed/);

  assert.match(brief, /Active or pressed state/);
  assert.match(brief, /Disabled state/);
});
