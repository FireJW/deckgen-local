import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { renderPptMasterDeck } from '../src/renderers/ppt-master/render.mjs';

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

const makeFakePptMaster = (scriptBody) => {
  const root = path.join(os.tmpdir(), `deckgen-ppt-master-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const scriptDir = path.join(root, 'skills', 'ppt-master', 'scripts');
  mkdirSync(scriptDir, { recursive: true });
  writeFileSync(path.join(scriptDir, 'svg_to_pptx.py'), scriptBody, 'utf8');
  return root;
};

test('renderPptMasterDeck requires pptMasterPath', () => {
  assert.throws(
    () => renderPptMasterDeck({ contract: { title: 'x', slides: [] }, config: {} }),
    /pptMasterPath/
  );
});

test('renderPptMasterDeck writes ppt-master project input and returns real artifacts only', () => {
  const pptMasterPath = makeFakePptMaster(`
const fs = require('fs');
const path = require('path');
const projectDir = process.argv[2];
const exportsDir = path.join(projectDir, 'exports');
fs.mkdirSync(exportsDir, { recursive: true });
fs.writeFileSync(path.join(exportsDir, 'fake.pptx'), 'pptx');
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
    /did not create a PPTX artifact/i
  );
});
