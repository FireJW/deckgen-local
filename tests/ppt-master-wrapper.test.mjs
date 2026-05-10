import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderPptMasterDeck, resolvePptMasterPythonPath } from '../src/renderers/ppt-master/render.mjs';

const sampleContract = {
  title: 'Quarterly Briefing',
  audience: 'internal team',
  slides: [
    {
      id: 's01',
      role: 'cover',
      headline: 'Quarterly Briefing',
      body: 'internal team',
      evidence_refs: [],
      layout_intent: 'hero_dark'
    },
    {
      id: 's02',
      role: 'content',
      headline: 'Revenue expanded',
      body: 'Revenue expanded across the commercial segment.',
      evidence_refs: [],
      layout_intent: 'evidence'
    }
  ]
};

const createMinimalPptxBytes = (slideCount = sampleContract.slides.length) => {
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

const makeFakePptMaster = (scriptBody) => {
  const root = path.join(os.tmpdir(), `deckgen-ppt-master-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const scriptDir = path.join(root, 'skills', 'ppt-master', 'scripts');
  mkdirSync(scriptDir, { recursive: true });
  writeFileSync(path.join(root, 'fixture.pptx'), createMinimalPptxBytes());
  writeFileSync(path.join(scriptDir, 'svg_to_pptx.py'), scriptBody, 'utf8');
  return root;
};

test('renderPptMasterDeck requires pptMasterPath', () => {
  assert.throws(
    () => renderPptMasterDeck({ contract: { title: 'x', slides: [] }, config: {} }),
    /pptMasterPath/
  );
});

test('resolvePptMasterPythonPath prefers a checkout-local venv', () => {
  const pptMasterPath = path.join(os.tmpdir(), `deckgen-ppt-master-venv-${Date.now()}`);
  const relativePythonPath = process.platform === 'win32'
    ? path.join('.venv', 'Scripts', 'python.exe')
    : path.join('.venv', 'bin', 'python');
  const pythonPath = path.join(pptMasterPath, relativePythonPath);
  mkdirSync(path.dirname(pythonPath), { recursive: true });
  writeFileSync(pythonPath, '');

  assert.equal(resolvePptMasterPythonPath({ pptMasterPath, env: {} }), pythonPath);
});

test('renderPptMasterDeck writes ppt-master project input and returns real artifacts only', () => {
  const pptMasterPath = makeFakePptMaster(`
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', '..', '..', 'fixture.pptx'), path.join(exportsDir, 'fake.pptx'));
fs.writeFileSync(path.join(projectDir, 'exporter-args.json'), JSON.stringify(process.argv.slice(2), null, 2));
`);
  const outputDir = path.join(os.tmpdir(), `deckgen-ppt-project-${Date.now()}`);

  const result = renderPptMasterDeck({
    contract: sampleContract,
    content: '# Quarterly Briefing',
    config: { pptMasterPath, pythonPath: process.execPath },
    outputDir
  });

  assert.equal(result.projectDir, outputDir);
  assert.equal(result.exportsDir, path.join(outputDir, 'exports'));
  assert.deepEqual(result.pptxPaths, [path.join(outputDir, 'exports', 'fake.pptx')]);
  assert.deepEqual(result.pptxQa, [{
    path: path.join(outputDir, 'exports', 'fake.pptx'),
    expected_slide_count: 2,
    actual_slide_count: 2
  }]);
  assert.ok(existsSync(path.join(outputDir, 'deck_contract.json')));
  assert.ok(existsSync(path.join(outputDir, 'content.md')));
  assert.ok(existsSync(path.join(outputDir, 'design_spec.md')));
  assert.ok(existsSync(path.join(outputDir, 'notes', '01_s01.md')));
  assert.ok(existsSync(path.join(outputDir, 'svg_output', '01_s01.svg')));
  assert.ok(existsSync(path.join(outputDir, 'svg_final', '02_s02.svg')));

  const args = JSON.parse(readFileSync(path.join(outputDir, 'exporter-args.json'), 'utf8'));
  assert.equal(args[0], outputDir);
  assert.match(readFileSync(path.join(outputDir, 'svg_output', '02_s02.svg'), 'utf8'), /Revenue expanded/);
});

test('renderPptMasterDeck renders markdown table bodies into pptx svg table blocks', () => {
  const pptMasterPath = makeFakePptMaster(`
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.copyFileSync(path.join(__dirname, '..', '..', '..', 'fixture.pptx'), path.join(exportsDir, 'fake.pptx'));
`);
  const outputDir = path.join(os.tmpdir(), `deckgen-table-ppt-project-${Date.now()}`);
  const tableContract = {
    ...sampleContract,
    slides: [
      sampleContract.slides[0],
      {
        ...sampleContract.slides[1],
        headline: 'Candidate Table',
        body: [
          '| Rank | Symbol | Score |',
          '|---:|---|---:|',
          '| 1 | `000988.SZ` | 75.05 |'
        ].join('\n')
      }
    ]
  };

  renderPptMasterDeck({
    contract: tableContract,
    content: '# Candidate Table',
    config: { pptMasterPath, pythonPath: process.execPath },
    outputDir
  });

  const svg = readFileSync(path.join(outputDir, 'svg_final', '02_s02.svg'), 'utf8');
  assert.match(svg, /class="ppt-table"/);
  assert.match(svg, />Rank</);
  assert.match(svg, />000988\.SZ</);
  assert.match(svg, />75\.05</);
  assert.doesNotMatch(svg, /\| Rank \| Symbol \| Score \|/);
});

test('renderPptMasterDeck rejects pptx artifacts with the wrong slide count', () => {
  const pptMasterPath = makeFakePptMaster(`
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', '..', '..', 'fixture.pptx'), Buffer.from(${JSON.stringify([...createMinimalPptxBytes(1)])}));
fs.copyFileSync(path.join(__dirname, '..', '..', '..', 'fixture.pptx'), path.join(exportsDir, 'wrong-count.pptx'));
`);
  const outputDir = path.join(os.tmpdir(), `deckgen-wrong-count-ppt-project-${Date.now()}`);

  assert.throws(
    () => renderPptMasterDeck({
      contract: sampleContract,
      content: '# Quarterly Briefing',
      config: { pptMasterPath, pythonPath: process.execPath },
      outputDir
    }),
    /slide count/i
  );
});

test('renderPptMasterDeck fails if exporter does not create a pptx artifact', () => {
  const pptMasterPath = makeFakePptMaster('process.exit(0);\n');
  const outputDir = path.join(os.tmpdir(), `deckgen-empty-ppt-project-${Date.now()}`);

  assert.throws(
    () => renderPptMasterDeck({
      contract: sampleContract,
      content: '# Quarterly Briefing',
      config: { pptMasterPath, pythonPath: process.execPath },
      outputDir
    }),
    /PPTX artifact/i
  );
});

test('renderPptMasterDeck rejects invalid pptx artifacts', () => {
  const pptMasterPath = makeFakePptMaster(`
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.writeFileSync(path.join(exportsDir, 'invalid.pptx'), 'not a pptx package');
`);
  const outputDir = path.join(os.tmpdir(), `deckgen-invalid-ppt-project-${Date.now()}`);

  assert.throws(
    () => renderPptMasterDeck({
      contract: sampleContract,
      content: '# Quarterly Briefing',
      config: { pptMasterPath, pythonPath: process.execPath },
      outputDir
    }),
    /valid PPTX artifact/i
  );
});
