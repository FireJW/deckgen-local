import { strict as assert } from 'node:assert';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src', 'cli', 'deckgen.mjs');
const source = path.join(root, 'fixtures', 'generic-markdown', 'briefing.md');
const learningSource = path.join(root, 'fixtures', 'generic-markdown', 'learning.md');
const swissSource = path.join(root, 'fixtures', 'generic-markdown', 'swiss-briefing.md');
const articlePackageSource = path.join(root, 'fixtures', 'source-packages', 'article', 'basic');
const publishPackageSource = path.join(root, 'fixtures', 'source-packages', 'publish-package', 'basic');
const obsidianReadingLabSource = path.join(root, 'fixtures', 'source-packages', 'obsidian-reading-lab', 'basic');
const reportDirectorySource = path.join(root, 'fixtures', 'source-packages', 'report-directory', 'basic');

const runGenerate = (args, options = {}) => spawnSync(process.execPath, [cli, 'generate', ...args], {
  encoding: 'utf8',
  cwd: options.cwd,
  env: { ...process.env, ...options.env }
});

const writtenRunDir = (stdout) => stdout.match(/written (.+)$/m)?.[1]?.trim();

const createMinimalPptxBytes = (slideCount = 4) => {
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

const makeFakePptMaster = (slideCount = 4) => {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-fake-ppt-master-'));
  const scriptDir = path.join(rootDir, 'skills', 'ppt-master', 'scripts');
  mkdirSync(scriptDir, { recursive: true });
  writeFileSync(path.join(rootDir, 'fixture.pptx'), createMinimalPptxBytes(slideCount));
  writeFileSync(path.join(scriptDir, 'svg_to_pptx.py'), `
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', '..', '..', 'fixture.pptx'), path.join(exportsDir, 'cli-fake.pptx'));
`, 'utf8');
  return rootDir;
};

const makeFakePython = () => {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-fake-python-'));
  const scriptPath = path.join(rootDir, 'fake-python.mjs');
  writeFileSync(scriptPath, `#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args[0] === '--version') {
  process.stdout.write('Python 3.12.13\\n');
  process.exit(0);
}

if (args[0] === '-c' && args.slice(1).join(' ').includes('from pptx import Presentation')) {
  process.stdout.write('python-pptx import ok\\n');
  process.exit(0);
}

const run = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (run.error) {
  process.stderr.write(String(run.error.message) + '\\n');
  process.exit(1);
}
process.exit(run.status ?? 0);
`, 'utf8');

  if (process.platform !== 'win32') {
    chmodSync(scriptPath, 0o755);
    return scriptPath;
  }

  const commandPath = path.join(rootDir, 'fake-python.cmd');
  writeFileSync(commandPath, [
    '@echo off',
    `"${process.execPath}" "%~dp0fake-python.mjs" %*`,
    ''
  ].join('\r\n'), 'utf8');
  return commandPath;
};

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lJ4QfQAAAABJRU5ErkJggg==',
  'base64'
);

test('generate writes a run bundle with html and qc report', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /written/);
  const runDir = writtenRunDir(run.stdout);
  const report = readFileSync(path.join(runDir, 'qc_report.md'), 'utf8');
  assert.match(report, /validation: PASS/);
  assert.ok(existsSync(path.join(runDir, 'request.json')));
  assert.ok(existsSync(path.join(runDir, 'content.md')));
  assert.ok(existsSync(path.join(runDir, 'deck_contract.json')));
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
  assert.ok(existsSync(path.join(runDir, 'run_result.json')));
  const runResult = JSON.parse(readFileSync(path.join(runDir, 'run_result.json'), 'utf8'));
  assert.equal(runResult.ok, true);
  assert.equal(runResult.source_type, 'generic-markdown');
  assert.equal(runResult.profile, 'briefing');
  assert.equal(runResult.output, 'html');
  assert.equal(runResult.runDir, runDir);
  assert.equal(runResult.htmlPath, path.join(runDir, 'html', 'index.html'));
  assert.deepEqual(runResult.pptxPaths, []);
  assert.equal(runResult.qcReportPath, path.join(runDir, 'qc_report.md'));
  assert.match(readFileSync(path.join(runDir, 'html', 'index.html'), 'utf8'), /class="slide-evidence-refs"/);
});

test('generate can emit machine-readable json output for callers', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-json-output-'));
  const run = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp, '--json']);

  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stdout, /^written /m);
  const result = JSON.parse(run.stdout);

  assert.equal(result.ok, true);
  assert.equal(result.command, 'generate');
  assert.equal(result.source_type, 'generic-markdown');
  assert.deepEqual(result.outputs, ['html']);
  assert.equal(result.pptxPaths.length, 0);
  assert.ok(existsSync(result.runDir));
  assert.equal(result.htmlPath, path.join(result.runDir, 'html', 'index.html'));
  assert.equal(result.qcReportPath, path.join(result.runDir, 'qc_report.md'));
});

test('generate writes guizang html motion asset next to index.html', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const htmlPath = path.join(runDir, 'html', 'index.html');
  const motionAssetPath = path.join(runDir, 'html', 'assets', 'motion.min.js');
  const html = readFileSync(htmlPath, 'utf8');

  assert.ok(existsSync(motionAssetPath));
  assert.match(html, /import\('\.\/assets\/motion\.min\.js'\)/);
});

test('generate auto-detects article package directory sources', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', articlePackageSource, '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const request = JSON.parse(readFileSync(path.join(runDir, 'request.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(runDir, 'source_manifest.json'), 'utf8'));
  const contract = JSON.parse(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'));

  assert.equal(request.source_type, 'article-package');
  assert.equal(request.profile, 'article');
  assert.equal(manifest.type, 'article-package');
  assert.equal(manifest.manifest.path, path.join(articlePackageSource, 'deckgen.source.json'));
  assert.equal(manifest.primary.path, path.join(articlePackageSource, 'content.md'));
  assert.equal(contract.profile, 'article');
  assert.equal(contract.title, 'Detected Article Package');
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
});

test('generate auto-detects publish-package/v1 directory sources', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', publishPackageSource, '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const request = JSON.parse(readFileSync(path.join(runDir, 'request.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(runDir, 'source_manifest.json'), 'utf8'));
  const contract = JSON.parse(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'));
  assert.equal(request.source_type, 'publish-package');
  assert.equal(request.profile, 'article');
  assert.equal(manifest.type, 'publish-package');
  assert.equal(manifest.contract_version, 'publish-package/v1');
  assert.equal(contract.title, 'Publish Package Deck');
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
});

test('generate auto-detects Obsidian reading-lab directory sources', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', obsidianReadingLabSource, '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const request = JSON.parse(readFileSync(path.join(runDir, 'request.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(runDir, 'source_manifest.json'), 'utf8'));
  const contract = JSON.parse(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'));
  assert.equal(request.source_type, 'obsidian-reading-lab');
  assert.equal(request.profile, 'learning');
  assert.equal(manifest.type, 'obsidian-reading-lab');
  assert.equal(manifest.schema, 'agent_reading_lab/v1');
  assert.equal(contract.title, 'hello-agents - Chapter 4: ReAct');
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
});

test('generate auto-detects report.md directory sources', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', reportDirectorySource, '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const request = JSON.parse(readFileSync(path.join(runDir, 'request.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(path.join(runDir, 'source_manifest.json'), 'utf8'));
  const contract = JSON.parse(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'));
  assert.equal(request.source_type, 'research-report');
  assert.equal(request.profile, 'briefing');
  assert.equal(manifest.type, 'research-report');
  assert.equal(contract.title, 'Research Report Sample');
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
});

test('generate propagates learning text_split layout to html output', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const run = runGenerate(['--source', learningSource, '--profile', 'learning', '--output', 'html', '--workdir', tmp]);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const html = readFileSync(path.join(runDir, 'html', 'index.html'), 'utf8');
  assert.match(html, /layout-text-split/);
});

test('generate lets CLI theme override the source renderer hint', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-cli-theme-'));
  const run = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp, '--theme', 'swiss-green']);

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const request = JSON.parse(readFileSync(path.join(runDir, 'request.json'), 'utf8'));
  const contract = JSON.parse(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'));
  const html = readFileSync(path.join(runDir, 'html', 'index.html'), 'utf8');

  assert.equal(request.theme, 'swiss-green');
  assert.equal(contract.theme.renderer_hint, 'swiss-green');
  assert.match(html, /data-renderer="html-guizang-swiss"/);
  assert.match(html, /data-swiss-theme="swiss-green"/);
});

test('generate fails closed for pptx output until ppt-master wrapper exists', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const isolatedCwd = mkdtempSync(path.join(os.tmpdir(), 'deckgen-no-ppt-master-'));
  const run = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'pptx', '--workdir', tmp], {
    cwd: isolatedCwd
  });

  assert.notEqual(run.status, 0);
  assert.doesNotMatch(run.stdout, /written/);
  assert.match(run.stderr, /pptMasterPath|ppt-master/i);
});

test('generate fails closed for both output until ppt-master wrapper exists', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const isolatedCwd = mkdtempSync(path.join(os.tmpdir(), 'deckgen-no-ppt-master-'));
  const run = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'both', '--workdir', tmp], {
    cwd: isolatedCwd
  });

  assert.notEqual(run.status, 0);
  assert.doesNotMatch(run.stdout, /written/);
  assert.match(run.stderr, /pptMasterPath|ppt-master/i);
});

test('generate fails closed before bundle creation when ppt-master python lacks python-pptx', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const pptMasterPath = makeFakePptMaster();
  const run = runGenerate(
    ['--source', source, '--profile', 'briefing', '--output', 'pptx', '--workdir', tmp, '--ppt-master-path', pptMasterPath],
    { env: { DECKGEN_PPT_MASTER_PYTHON: process.execPath } }
  );

  assert.notEqual(run.status, 0);
  assert.doesNotMatch(run.stdout, /written/);
  assert.match(run.stderr, /python-pptx/i);
  assert.equal(existsSync(path.join(tmp, '.tmp', 'deckgen')), false);
});

test('generate writes pptx output only when ppt-master creates an artifact', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const pptMasterPath = makeFakePptMaster();
  const pythonPath = makeFakePython();
  const run = runGenerate(
    ['--source', source, '--profile', 'briefing', '--output', 'pptx', '--workdir', tmp, '--ppt-master-path', pptMasterPath],
    { env: { DECKGEN_PPT_MASTER_PYTHON: pythonPath } }
  );

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  assert.ok(existsSync(path.join(runDir, 'ppt-master', 'exports', 'cli-fake.pptx')));
  assert.ok(existsSync(path.join(runDir, 'ppt-master', 'deck_contract.json')));
  assert.equal(existsSync(path.join(runDir, 'html', 'index.html')), false);
  assert.match(readFileSync(path.join(runDir, 'qc_report.md'), 'utf8'), /pptx_slide_count: PASS 4\/4/);
});

test('generate writes sibling html and pptx outputs for both mode', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const pptMasterPath = makeFakePptMaster();
  const pythonPath = makeFakePython();
  const run = runGenerate(
    ['--source', source, '--profile', 'briefing', '--output', 'both', '--workdir', tmp, '--ppt-master-path', pptMasterPath],
    { env: { DECKGEN_PPT_MASTER_PYTHON: pythonPath } }
  );

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
  assert.ok(existsSync(path.join(runDir, 'ppt-master', 'exports', 'cli-fake.pptx')));
});

test('generate writes sibling Swiss html and pptx outputs for both mode', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-swiss-both-'));
  const pptMasterPath = makeFakePptMaster(7);
  const pythonPath = makeFakePython();
  const run = runGenerate(
    ['--source', swissSource, '--profile', 'briefing', '--output', 'both', '--workdir', tmp, '--ppt-master-path', pptMasterPath],
    { env: { DECKGEN_PPT_MASTER_PYTHON: pythonPath } }
  );

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const html = readFileSync(path.join(runDir, 'html', 'index.html'), 'utf8');
  assert.match(html, /data-renderer="html-guizang-swiss"/);
  assert.match(html, /data-swiss-theme="swiss-ikb"/);
  const svg = readFileSync(path.join(runDir, 'ppt-master', 'svg_final', '02_s02.svg'), 'utf8');
  assert.match(svg, /data-renderer="ppt-master-swiss"/);
});

test('generate copies local markdown image assets into sibling html and pptx outputs', () => {
  const sourceRoot = mkdtempSync(path.join(os.tmpdir(), 'deckgen-image-source-'));
  const assetsDir = path.join(sourceRoot, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(path.join(assetsDir, 'revenue bridge.png'), tinyPng);
  const imageSource = path.join(sourceRoot, 'image-briefing.md');
  writeFileSync(imageSource, [
    '---',
    'title: Image Asset Deck',
    '---',
    '',
    '![Revenue bridge](assets/revenue%20bridge.png)'
  ].join('\n'), 'utf8');

  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-image-output-'));
  const pptMasterPath = makeFakePptMaster(2);
  const pythonPath = makeFakePython();
  const run = runGenerate(
    ['--source', imageSource, '--profile', 'briefing', '--output', 'both', '--workdir', tmp, '--ppt-master-path', pptMasterPath],
    { env: { DECKGEN_PPT_MASTER_PYTHON: pythonPath } }
  );

  assert.equal(run.status, 0, run.stderr);
  const runDir = writtenRunDir(run.stdout);
  const htmlAssetDir = path.join(runDir, 'html', 'assets', 'images');
  const pptAssetDir = path.join(runDir, 'ppt-master', 'assets', 'images');
  const htmlAssets = readdirSync(htmlAssetDir);
  const pptAssets = readdirSync(pptAssetDir);

  assert.equal(htmlAssets.length, 1);
  assert.equal(pptAssets.length, 1);
  assert.deepEqual(readFileSync(path.join(htmlAssetDir, htmlAssets[0])), tinyPng);
  assert.deepEqual(readFileSync(path.join(pptAssetDir, pptAssets[0])), tinyPng);

  const html = readFileSync(path.join(runDir, 'html', 'index.html'), 'utf8');
  assert.match(html, /src="assets\/images\/[^"]+\.png"/);
  assert.doesNotMatch(html, /assets\/revenue%20bridge\.png/);

  const svg = readFileSync(path.join(runDir, 'ppt-master', 'svg_final', '02_s02.svg'), 'utf8');
  assert.match(svg, /<image\b/);
  assert.match(svg, /href="assets\/images\/[^"]+\.png"/);
  assert.doesNotMatch(svg, /Image asset placeholder/);

  const rootContract = JSON.parse(readFileSync(path.join(runDir, 'deck_contract.json'), 'utf8'));
  assert.equal(rootContract.slides[1].body, '![Revenue bridge](assets/revenue%20bridge.png)');
});

test('generate reports missing local image assets as user errors', () => {
  const sourceRoot = mkdtempSync(path.join(os.tmpdir(), 'deckgen-missing-image-source-'));
  const imageSource = path.join(sourceRoot, 'missing-image.md');
  writeFileSync(imageSource, [
    '---',
    'title: Missing Image Deck',
    '---',
    '',
    '![Missing visual](assets/missing.png)'
  ].join('\n'), 'utf8');
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-missing-image-output-'));
  const run = runGenerate(['--source', imageSource, '--profile', 'briefing', '--output', 'html', '--workdir', tmp]);

  assert.notEqual(run.status, 0);
  assert.doesNotMatch(run.stdout, /written/);
  assert.match(run.stderr, /Image asset not found/);
  assert.match(run.stderr, /Usage:/);
  assert.doesNotMatch(run.stderr, /at materializeLocalImageAssets/);
});

test('generate uses unique run directories for two html runs under one workdir', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const first = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp]);
  const second = runGenerate(['--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp]);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);

  const firstRunDir = writtenRunDir(first.stdout);
  const secondRunDir = writtenRunDir(second.stdout);
  assert.notEqual(firstRunDir, secondRunDir);
  assert.ok(existsSync(firstRunDir));
  assert.ok(existsSync(secondRunDir));
});

test('bundle writing validates contract before creating run artifacts', async () => {
  const { writeGenerateBundle } = await import('../src/cli/generate.mjs').catch((error) => {
    assert.fail(`generate runtime export unavailable: ${error.message}`);
  });
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const invalidContract = {
    schema_version: 'deck-contract/v1',
    title: 'Invalid deck',
    audience: 'internal briefing',
    profile: 'briefing',
    duration_minutes: 2,
    target_slide_count: 2,
    language: 'zh-CN',
    source_refs: [],
    hard_constraints: [],
    theme: { renderer_hint: 'indigo_porcelain' },
    slides: [{
      id: 's01',
      role: 'cover',
      headline: 'Invalid deck',
      body: 'internal briefing',
      evidence_refs: [],
      layout_intent: 'hero_dark'
    }],
    outputs: ['html']
  };

  assert.throws(() => writeGenerateBundle({
    workdir: tmp,
    request: { command: 'generate' },
    sourceManifest: { primary: { path: source, bytes: 1, modified_at: new Date(0).toISOString() } },
    content: '# Invalid deck',
    contract: invalidContract,
    sourcePath: source
  }), /Deck contract validation failed/);
  assert.equal(existsSync(path.join(tmp, '.tmp', 'deckgen')), false);
});

test('run directory creation uses full uuid and retries exclusive-create collisions', async () => {
  const { createRunDirectory } = await import('../src/cli/generate.mjs').catch((error) => {
    assert.fail(`generate runtime export unavailable: ${error.message}`);
  });
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const timestamp = new Date('2026-05-10T00:00:00.000Z');
  const firstUuid = '11111111-1111-4111-8111-111111111111';
  const secondUuid = '22222222-2222-4222-8222-222222222222';
  const firstRunId = `2026-05-10T00-00-00-000Z-${firstUuid}`;
  mkdirSync(path.join(tmp, '.tmp', 'deckgen', firstRunId), { recursive: true });
  let uuidCalls = 0;

  const created = createRunDirectory(tmp, {
    now: () => timestamp,
    randomUUID: () => {
      uuidCalls += 1;
      return uuidCalls === 1 ? firstUuid : secondUuid;
    }
  });

  assert.equal(uuidCalls, 2);
  assert.equal(path.basename(created.runDir), `2026-05-10T00-00-00-000Z-${secondUuid}`);
  assert.ok(existsSync(created.runDir));
});
