import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateHtmlAnythingTemplate } from '../src/lab/html-anything/evaluate.mjs';
import { buildHtmlAnythingLabReport } from '../src/lab/html-anything/report.mjs';
import { loadHtmlAnythingLabRun } from '../src/lab/html-anything/run.mjs';
import { loadHtmlAnythingTemplateIndex, validateHtmlAnythingTemplateIndex } from '../src/lab/html-anything/template-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'));
const readTemplateIndexFixture = () => readJson(path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json'));

test('loadHtmlAnythingLabRun writes a report under .tmp/html-anything-lab', (t) => {
  const workdir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-html-anything-run-'));
  t.after(() => rmSync(workdir, { recursive: true, force: true }));
  const templateIndexPath = path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json');
  const sourcePaths = [
    path.join(root, 'fixtures', 'generic-markdown', 'briefing.md'),
    path.join(root, 'fixtures', 'source-packages', 'publish-package', 'basic')
  ];

  const result = loadHtmlAnythingLabRun({
    workdir,
    templateIndexPath,
    sourcePaths,
    now: () => new Date('2026-05-15T00:00:00.000Z'),
    randomUUID: () => 'test-runner'
  });

  assert.equal(result.ok, true);
  assert.match(result.runDir, /\.tmp[\\/]+html-anything-lab[\\/]+/);
  assert.ok(result.reportPath.endsWith('report.md'));

  const requestPath = path.join(result.runDir, 'request.json');
  const upstreamTemplateIndexPath = path.join(result.runDir, 'upstream-template-index.json');
  const reportPath = path.join(result.runDir, 'report.md');
  const runResultPath = path.join(result.runDir, 'run_result.json');
  assert.equal(existsSync(requestPath), true);
  assert.equal(existsSync(upstreamTemplateIndexPath), true);
  assert.equal(existsSync(reportPath), true);
  assert.equal(existsSync(runResultPath), true);

  assert.deepEqual(readJson(requestPath), {
    command: 'html-anything-lab',
    templateIndexPath,
    sourcePaths
  });
  assert.equal(readJson(upstreamTemplateIndexPath).schema, 'html_anything_template_index/v1');
  assert.match(readFileSync(reportPath, 'utf8'), /HTML Anything Local Template Lab/);
  assert.deepEqual(readJson(runResultPath), result);
});

test('loadHtmlAnythingLabRun does not create a run directory when source loading fails', (t) => {
  const workdir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-html-anything-bad-source-'));
  t.after(() => rmSync(workdir, { recursive: true, force: true }));
  const runRoot = path.join(workdir, '.tmp', 'html-anything-lab');

  assert.throws(() => loadHtmlAnythingLabRun({
    workdir,
    templateIndexPath: path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json'),
    sourcePaths: [path.join(root, 'fixtures', 'generic-markdown', 'missing.md')],
    now: () => new Date('2026-05-15T00:00:00.000Z'),
    randomUUID: () => 'bad-source'
  }), /Source file not found/);

  assert.equal(existsSync(runRoot), false);
});

test('html-anything-lab cli prints help', () => {
  const cli = path.join(root, 'scripts', 'html-anything-lab.mjs');
  const result = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /html-anything lab/);
  assert.match(result.stdout, /--source/);
  assert.match(result.stdout, /--template-index/);
});

test('html-anything-lab cli runs defaults with no args and prints text output', (t) => {
  const cli = path.join(root, 'scripts', 'html-anything-lab.mjs');
  const result = spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8' });
  const writtenMatch = result.stdout.trim().match(/^written (.+html-anything-lab.+)$/);
  if (writtenMatch) {
    t.after(() => rmSync(writtenMatch[1], { recursive: true, force: true }));
  }

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /written .+html-anything-lab/);
});

test('html-anything-lab cli resolves user paths from the caller cwd', (t) => {
  const cli = path.join(root, 'scripts', 'html-anything-lab.mjs');
  const callerCwd = path.join(root, 'fixtures');
  const workdirArg = `../.tmp/html-anything-cli-cwd-${process.pid}-${Date.now()}`;
  const expectedWorkdir = path.resolve(callerCwd, workdirArg);
  t.after(() => rmSync(expectedWorkdir, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [
    cli,
    '--template-index',
    'html-anything-lab/template-index.json',
    '--source',
    'generic-markdown/briefing.md',
    '--workdir',
    workdirArg,
    '--json'
  ], { cwd: callerCwd, encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.runDir.startsWith(path.join(expectedWorkdir, '.tmp', 'html-anything-lab')), true);
  assert.deepEqual(readJson(path.join(payload.runDir, 'request.json')), {
    command: 'html-anything-lab',
    templateIndexPath: path.join(callerCwd, 'html-anything-lab', 'template-index.json'),
    sourcePaths: [path.join(callerCwd, 'generic-markdown', 'briefing.md')]
  });
});

test('html-anything-lab cli reports missing template index without a stack trace', () => {
  const cli = path.join(root, 'scripts', 'html-anything-lab.mjs');
  const result = spawnSync(process.execPath, [
    cli,
    '--template-index',
    'fixtures/html-anything-lab/missing-template-index.json',
    '--source',
    'fixtures/generic-markdown/briefing.md'
  ], { cwd: root, encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Could not read template index/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
  assert.doesNotMatch(result.stderr, /Node\.js v/);
});

test('html-anything-lab cli reports bad source without a stack trace', () => {
  const cli = path.join(root, 'scripts', 'html-anything-lab.mjs');
  const result = spawnSync(process.execPath, [
    cli,
    '--template-index',
    'fixtures/html-anything-lab/template-index.json',
    '--source',
    'fixtures/generic-markdown/missing.md'
  ], { cwd: root, encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Source file not found/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
  assert.doesNotMatch(result.stderr, /Node\.js v/);
});

test('validateHtmlAnythingTemplateIndex accepts the checked-in fixture', () => {
  const index = readTemplateIndexFixture();

  const result = validateHtmlAnythingTemplateIndex(index);

  assert.equal(result.ok, true);
  assert.equal(result.templates.length, 7);
  assert.equal(result.templates[0].id, 'deck-swiss-international');
});

test('validateHtmlAnythingTemplateIndex rejects malformed selected template metadata', () => {
  const cases = [
    {
      name: 'unknown template id',
      mutate: (index) => { index.templates[0].id = 'unknown-template'; },
      pattern: /unknown template id/i
    },
    {
      name: 'missing destination',
      mutate: (index) => { delete index.templates[0].destination; },
      pattern: /destination/i
    },
    {
      name: 'bad example checksum',
      mutate: (index) => { index.templates[0].example_sha256 = 'not-a-sha'; },
      pattern: /example_sha256/i
    },
    {
      name: 'missing license note',
      mutate: (index) => { delete index.templates[0].license_note; },
      pattern: /license/i
    },
    {
      name: 'empty supported profiles',
      mutate: (index) => { index.templates[0].supported_profiles = []; },
      pattern: /supported_profiles/i
    },
    {
      name: 'non-string contract field',
      mutate: (index) => { index.templates[0].contract_fields = ['title', 42]; },
      pattern: /contract_fields/i
    },
    {
      name: 'bad source commit',
      mutate: (index) => { index.source.commit = 'A3FAC16D31ED75ADDCE4BD2D9C7097CE075BB71D'; },
      pattern: /source metadata/i
    }
  ];

  for (const { name, mutate, pattern } of cases) {
    const index = readTemplateIndexFixture();
    mutate(index);

    const result = validateHtmlAnythingTemplateIndex(index);

    assert.equal(result.ok, false, name);
    assert.match(result.error, pattern, name);
  }
});

test('validateHtmlAnythingTemplateIndex rejects missing source metadata', () => {
  const result = validateHtmlAnythingTemplateIndex({
    schema: 'html_anything_template_index/v1',
    source: {},
    templates: [{ id: 'broken-template' }]
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /source/i);
});

test('validateHtmlAnythingTemplateIndex rejects non-object template entries', () => {
  const result = validateHtmlAnythingTemplateIndex({
    schema: 'html_anything_template_index/v1',
    source: {
      repo: 'https://github.com/nexu-io/html-anything',
      commit: 'a3fac16d31ed75addce4bd2d9c7097ce075bb71d'
    },
    templates: [null]
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /template.*object/i);
});

test('loadHtmlAnythingTemplateIndex rejects invalid json', (t) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-html-anything-index-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'template-index.json');
  writeFileSync(file, '{not json', 'utf8');

  assert.throws(() => loadHtmlAnythingTemplateIndex(file), /invalid json/i);
});

test('evaluateHtmlAnythingTemplate classifies a source deterministically', () => {
  const template = {
    id: 'article-magazine',
    supported_profiles: ['article'],
    contract_fields: ['title', 'content', 'source_refs[]'],
    decision: 'promote'
  };
  const sourcePackage = {
    sourceType: 'publish-package',
    profile: 'article',
    contract: {
      title: 'Sample title',
      content: 'Sample content',
      source_refs: [{ id: 'primary', path: 'content.md' }]
    }
  };

  const result = evaluateHtmlAnythingTemplate({ template, sourcePackage });

  assert.equal(result.status, 'promote');
  assert.deepEqual(result.missingContractFields, []);
  assert.equal(result.supportsProfile, true);
  assert.match(result.fallback, /existing deckgen renderer/i);
});

test('evaluateHtmlAnythingTemplate marks unsupported profiles as hold or reject', () => {
  const template = {
    id: 'video-hyperframes',
    supported_profiles: ['learning'],
    contract_fields: ['title', 'slides[].headline'],
    decision: 'reject'
  };
  const sourcePackage = {
    sourceType: 'generic-markdown',
    profile: 'briefing',
    contract: { title: 'Briefing', slides: [] }
  };

  const result = evaluateHtmlAnythingTemplate({ template, sourcePackage });

  assert.equal(result.status, 'reject');
  assert.equal(result.supportsProfile, false);
  assert.match(result.fallback, /does not support briefing/i);
});

test('evaluateHtmlAnythingTemplate requires final array fields to be non-empty', () => {
  const template = {
    id: 'article-magazine',
    supported_profiles: ['article'],
    contract_fields: ['title', 'source_refs[]'],
    decision: 'promote'
  };
  const sourcePackage = {
    sourceType: 'publish-package',
    profile: 'article',
    contract: { title: 'Sample title', source_refs: [] }
  };

  const result = evaluateHtmlAnythingTemplate({ template, sourcePackage });

  assert.equal(result.status, 'hold');
  assert.deepEqual(result.missingContractFields, ['source_refs[]']);
  assert.match(result.fallback, /source_refs\[\]/);
});

test('evaluateHtmlAnythingTemplate requires every nested array item to include required fields', () => {
  const template = {
    id: 'learning-slides',
    supported_profiles: ['learning'],
    contract_fields: ['title', 'slides[].body'],
    decision: 'promote'
  };
  const sourcePackage = {
    sourceType: 'obsidian-reading-lab',
    profile: 'learning',
    contract: {
      title: 'Learning deck',
      slides: [{ body: 'Intro' }, { headline: 'Missing body' }]
    }
  };

  const result = evaluateHtmlAnythingTemplate({ template, sourcePackage });

  assert.equal(result.status, 'hold');
  assert.deepEqual(result.missingContractFields, ['slides[].body']);
});

test('buildHtmlAnythingLabReport renders a comparison summary', () => {
  const report = buildHtmlAnythingLabReport({
    runId: '2026-05-14T12-00-00Z-test',
    index: {
      source: { repo: 'https://github.com/nexu-io/html-anything', commit: 'a3fac16d31ed75addce4bd2d9c7097ce075bb71d' }
    },
    results: [{
      sourcePath: 'fixtures/source-packages/publish-package/basic',
      sourceType: 'publish-package',
      profile: 'article',
      templateResults: [{
        id: 'article-magazine',
        status: 'promote',
        reason: 'profile supported and all required contract fields are available',
        fallback: 'Use existing deckgen renderer if implementation scope grows.',
        destination: 'html-anything/article-magazine',
        missingContractFields: ['source_refs[]', 'tables[]']
      }]
    }]
  });

  assert.match(report, /HTML Anything Local Template Lab/);
  assert.match(report, /article-magazine/);
  assert.match(report, /promote/);
  assert.match(report, /Fallback/);
  assert.match(report, /Fallback: Use existing deckgen renderer if implementation scope grows\./);
  assert.match(report, /Missing fields: source_refs\[\], tables\[\]/);
  assert.doesNotMatch(report, /Missing fields: - source_refs\[\]\n/);
});
