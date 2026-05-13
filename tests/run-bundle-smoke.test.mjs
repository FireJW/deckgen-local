import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  inspectDeckRunBundle,
  runDeckRunVisualSmokeGates,
  validateDeckRunBundleSmokeResult
} from '../src/qc/run-bundle-smoke.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'deck-run-smoke.mjs');

const createMinimalPptxBytes = (slideCount = 2) => {
  const entries = [
    '[Content_Types].xml',
    'ppt/presentation.xml',
    ...Array.from({ length: slideCount }, (_, index) => `ppt/slides/slide${index + 1}.xml`)
  ];
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entryName of entries) {
    const name = Buffer.from(entryName, 'utf8');
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    localParts.push(local);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDir, eocd]);
};

const validContract = (outputs = ['html', 'pptx'], sourceRefs = [
  { type: 'local_file', path: 'D:/source.md', role: 'primary', id: 'primary' }
]) => ({
  schema_version: 'deck-contract/v1',
  title: 'Run Smoke Deck',
  audience: 'operators',
  profile: 'briefing',
  duration_minutes: 8,
  target_slide_count: 2,
  language: 'zh-CN',
  source_refs: sourceRefs,
  hard_constraints: [],
  theme: { renderer_hint: 'indigo_porcelain' },
  slides: [
    {
      id: 's01',
      role: 'cover',
      headline: 'Run Smoke Deck',
      body: 'operators',
      evidence_refs: [],
      layout_intent: 'hero_dark'
    },
    {
      id: 's02',
      role: 'content',
      headline: 'Verified bundle',
      body: 'HTML and PPTX are siblings.',
      evidence_refs: [],
      layout_intent: 'evidence'
    }
  ],
  outputs
});

const makeRunBundle = ({
  outputs = ['html', 'pptx'],
  html = true,
  pptx = true,
  request = true,
  requestOutputs = outputs,
  runResult = true,
  runResultOutputs = outputs,
  runResultPptxPaths,
  runResultQcReportPath,
  runResultOverrides = {},
  sourceManifest = true,
  sourceManifestPrimaryPath = 'D:/source.md',
  contractSourceRefs = [
    { type: 'local_file', path: sourceManifestPrimaryPath, role: 'primary', id: 'primary' }
  ]
} = {}) => {
  const runDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-run-smoke-'));
  const resolvedRunResultPptxPaths = typeof runResultPptxPaths === 'function'
    ? runResultPptxPaths(runDir)
    : runResultPptxPaths;
  const output = outputs.length === 2 ? 'both' : outputs[0];
  if (request) {
    writeFileSync(path.join(runDir, 'request.json'), `${JSON.stringify({
      command: 'generate',
      source: 'fixtures/generic-markdown/briefing.md',
      source_type: 'generic-markdown',
      profile: 'briefing',
      output,
      outputs: requestOutputs,
      workdir: path.dirname(runDir)
    }, null, 2)}\n`, 'utf8');
  }
  if (runResult) {
    writeFileSync(path.join(runDir, 'run_result.json'), `${JSON.stringify({
      ok: true,
      command: 'generate',
      source_type: 'generic-markdown',
      profile: 'briefing',
      output,
      outputs: runResultOutputs,
      runDir,
      htmlPath: html ? path.join(runDir, 'html', 'index.html') : '',
      pptxPaths: resolvedRunResultPptxPaths ?? (pptx ? [path.join(runDir, 'ppt-master', 'exports', 'deck.pptx')] : []),
      qcReportPath: runResultQcReportPath ?? path.join(runDir, 'qc_report.md'),
      ...runResultOverrides
    }, null, 2)}\n`, 'utf8');
  }
  if (sourceManifest) {
    writeFileSync(path.join(runDir, 'source_manifest.json'), `${JSON.stringify({
      type: 'generic-markdown',
      primary: {
        path: sourceManifestPrimaryPath,
        bytes: 42,
        modified_at: new Date(0).toISOString()
      }
    }, null, 2)}\n`, 'utf8');
  }
  writeFileSync(path.join(runDir, 'content.md'), '# Run Smoke Deck\n\nVerified bundle.', 'utf8');
  writeFileSync(path.join(runDir, 'qc_report.md'), '# QC\n\nvalidation: PASS', 'utf8');
  writeFileSync(path.join(runDir, 'deck_contract.json'), `${JSON.stringify(validContract(outputs, contractSourceRefs), null, 2)}\n`, 'utf8');

  if (html) {
    mkdirSync(path.join(runDir, 'html'), { recursive: true });
    writeFileSync(path.join(runDir, 'html', 'index.html'), '<!doctype html><title>Run Smoke Deck</title>', 'utf8');
  }

  if (pptx) {
    const exportsDir = path.join(runDir, 'ppt-master', 'exports');
    mkdirSync(exportsDir, { recursive: true });
    writeFileSync(path.join(exportsDir, 'deck.pptx'), createMinimalPptxBytes(2));
  }

  return runDir;
};

test('inspectDeckRunBundle validates sibling html and pptx artifacts from the contract outputs', () => {
  const runDir = makeRunBundle();
  const summary = inspectDeckRunBundle({ runDir });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, true, validation.errors.join('\n'));
  assert.equal(summary.expectedSlides, 2);
  assert.equal(summary.html.ok, true);
  assert.equal(summary.pptx.ok, true);
  assert.equal(summary.pptx.slideCount, 2);
});

test('inspectDeckRunBundle fails closed when a requested sibling output is missing', () => {
  const runDir = makeRunBundle({ html: false });
  const summary = inspectDeckRunBundle({ runDir });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /html\/index\.html/i);
});

test('inspectDeckRunBundle fails closed when traceability files are missing', () => {
  const runDir = makeRunBundle({ request: false, runResult: false, sourceManifest: false });
  const summary = inspectDeckRunBundle({ runDir });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /request\.json/i);
  assert.match(validation.errors.join('\n'), /run_result\.json/i);
  assert.match(validation.errors.join('\n'), /source_manifest\.json/i);
});

test('inspectDeckRunBundle rejects traceability drift in request and source manifest files', () => {
  const outputMismatchRunDir = makeRunBundle({ requestOutputs: ['html'] });
  const outputMismatch = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({
    runDir: outputMismatchRunDir
  }));

  assert.equal(outputMismatch.ok, false);
  assert.match(outputMismatch.errors.join('\n'), /request\.json outputs/i);

  const sourcePathMissingRunDir = makeRunBundle({ sourceManifestPrimaryPath: ' ' });
  const sourcePathMissing = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({
    runDir: sourcePathMissingRunDir
  }));

  assert.equal(sourcePathMissing.ok, false);
  assert.match(sourcePathMissing.errors.join('\n'), /source_manifest\.json primary\.path/i);
});

test('inspectDeckRunBundle rejects source manifest primary path drift from contract source refs', () => {
  const runDir = makeRunBundle({
    sourceManifestPrimaryPath: 'D:/source.md',
    contractSourceRefs: [
      { type: 'local_file', path: 'D:/other-source.md', role: 'primary', id: 'primary' }
    ]
  });
  const validation = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({ runDir }));

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /deck_contract\.json source_refs/i);
  assert.match(validation.errors.join('\n'), /source_manifest\.json primary\.path/i);
});

test('inspectDeckRunBundle rejects drift in persisted run result files', () => {
  const runDir = makeRunBundle({ runResultOutputs: ['html'] });
  const validation = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({ runDir }));

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /run_result\.json outputs/i);
});

test('inspectDeckRunBundle rejects request metadata drift in persisted run result files', () => {
  const runDir = makeRunBundle({
    runResultOverrides: {
      profile: 'learning'
    }
  });
  const validation = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({ runDir }));

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /run_result\.json profile/i);
});

test('inspectDeckRunBundle rejects qc report path drift in persisted run result files', () => {
  const runDir = makeRunBundle({
    runResultQcReportPath: path.join(os.tmpdir(), 'deckgen-run-smoke-stale-qc-report.md')
  });
  const validation = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({ runDir }));

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /run_result\.json qcReportPath/i);
});

test('inspectDeckRunBundle rejects stale pptx paths in persisted run result files', () => {
  const runDir = makeRunBundle({
    runResultPptxPaths: (bundleDir) => [
      path.join(bundleDir, 'ppt-master', 'exports', 'stale.pptx')
    ]
  });
  const validation = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({ runDir }));

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /run_result\.json pptxPaths/i);
});

test('inspectDeckRunBundle rejects run result pptx paths that omit the validated artifact', () => {
  const runDir = makeRunBundle({
    runResultPptxPaths: (bundleDir) => [
      path.join(bundleDir, 'ppt-master', 'exports', 'old.pptx')
    ]
  });
  const oldPptxPath = path.join(runDir, 'ppt-master', 'exports', 'old.pptx');
  writeFileSync(oldPptxPath, createMinimalPptxBytes(2));
  utimesSync(oldPptxPath, new Date(0), new Date(0));
  const validation = validateDeckRunBundleSmokeResult(inspectDeckRunBundle({ runDir }));

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /validated pptx artifact/i);
});

test('runDeckRunVisualSmokeGates executes requested sibling visual smoke commands', () => {
  const runDir = makeRunBundle();
  const calls = [];
  const visual = runDeckRunVisualSmokeGates({
    runDir,
    expectedOutputs: ['html', 'pptx'],
    includeHtmlVisual: true,
    includePptxVisual: true,
    htmlVisualOptions: {
      moduleDir: 'D:/node_modules',
      browserExecutable: 'D:/Browser/msedge.exe',
      viewport: '390x844'
    },
    pptxVisualOptions: {
      slide: 2,
      powerPointExecutable: 'D:/Office/POWERPNT.EXE'
    },
    nodePath: 'node-test',
    rootDir: root,
    spawn: (command, args) => {
      calls.push({ command, args });
      return { status: 0, stdout: '{"ok":true}', stderr: '' };
    }
  });

  assert.equal(visual.html.ok, true);
  assert.equal(visual.pptx.ok, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].args, [
    path.join(root, 'scripts', 'html-visual-smoke.mjs'),
    '--run-dir', path.resolve(runDir),
    '--module-dir', 'D:/node_modules',
    '--browser-executable', 'D:/Browser/msedge.exe',
    '--viewport', '390x844'
  ]);
  assert.deepEqual(calls[1].args, [
    path.join(root, 'scripts', 'pptx-visual-smoke.mjs'),
    '--run-dir', path.resolve(runDir),
    '--slide', '2',
    '--powerpoint-executable', 'D:/Office/POWERPNT.EXE'
  ]);
});

test('validateDeckRunBundleSmokeResult rejects failed requested visual smoke gates', () => {
  const runDir = makeRunBundle();
  const summary = inspectDeckRunBundle({ runDir });
  summary.visual = runDeckRunVisualSmokeGates({
    runDir,
    expectedOutputs: ['html', 'pptx'],
    includeHtmlVisual: true,
    includePptxVisual: true,
    rootDir: root,
    spawn: (command, args) => ({
      status: args[0].endsWith('html-visual-smoke.mjs') ? 1 : 0,
      stdout: args[0].endsWith('html-visual-smoke.mjs')
        ? '{"ok":false,"errors":["text overflow"]}'
        : '{"ok":true}',
      stderr: ''
    })
  });
  const validation = validateDeckRunBundleSmokeResult(summary);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /html visual smoke/i);
  assert.match(validation.errors.join('\n'), /text overflow/i);
});

test('deck-run-smoke script emits json and exits non-zero on invalid bundles', () => {
  const runDir = makeRunBundle({ pptx: false });
  const run = spawnSync(process.execPath, [script, '--run-dir', runDir], {
    encoding: 'utf8'
  });

  assert.notEqual(run.status, 0);
  assert.equal(run.stderr, '');
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /pptx/i);
  assert.match(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'), /"outputs":/);
});

test('deck-run-smoke script accepts optional visual gate flags without changing default output requirements', () => {
  const runDir = makeRunBundle({ outputs: ['pptx'], html: false, pptx: true });
  const run = spawnSync(process.execPath, [
    script,
    '--run-dir', runDir,
    '--include-html-visual'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.visual.html.required, false);
  assert.equal(result.visual.html.skipped, true);
});

test('deck-run-smoke script auto-enables html visual smoke when browser options are provided', () => {
  const generate = spawnSync(process.execPath, [
    path.join(root, 'src', 'cli', 'deckgen.mjs'),
    'generate',
    '--source', path.join(root, 'fixtures', 'generic-markdown', 'briefing.md'),
    '--profile', 'briefing',
    '--output', 'html',
    '--json'
  ], { encoding: 'utf8' });

  assert.equal(generate.status, 0, generate.stderr);
  const generated = JSON.parse(generate.stdout);
  assert.equal(generated.ok, true, generated.errors?.join?.('\n') ?? '');
  const runDir = generated.runDir;
  const run = spawnSync(process.execPath, [
    script,
    '--run-dir', runDir,
    '--module-dir', 'C:\\Users\\rickylu\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules',
    '--browser-executable', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.visual.html.required, true);
  assert.equal(result.visual.html.ok, true);
});
