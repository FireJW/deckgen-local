import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { inspectGuizangSourcePath } from '../src/integrations/guizang-ppt-skill.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'guizang-source-preflight.mjs');

const makeGuizangFixture = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-guizang-source-'));
  mkdirSync(path.join(dir, 'assets'), { recursive: true });
  writeFileSync(path.join(dir, 'LICENSE'), 'MIT License\nCopyright (c) 2026 op7418\n', 'utf8');
  writeFileSync(path.join(dir, 'README.md'), '# guizang-ppt-skill\n', 'utf8');
  writeFileSync(path.join(dir, 'assets', 'template.html'), '<!doctype html><title>Guizang</title>', 'utf8');
  return dir;
};

test('inspectGuizangSourcePath accepts a local source with license and template', () => {
  const sourcePath = makeGuizangFixture();
  const result = inspectGuizangSourcePath(sourcePath);

  assert.equal(result.ok, true);
  assert.equal(result.sourcePath, sourcePath);
  assert.match(result.licensePath, /LICENSE$/);
  assert.match(result.templatePath, /assets[\\/]template\.html$/);
});

test('inspectGuizangSourcePath fails closed when source is missing', () => {
  const result = inspectGuizangSourcePath(path.join(os.tmpdir(), 'missing-guizang-source'));

  assert.equal(result.ok, false);
  assert.match(result.error, /not found/i);
});

test('guizang source preflight script reports actionable missing-source failures', () => {
  const missingPath = path.join(os.tmpdir(), 'missing-guizang-source-cli');
  const run = spawnSync(process.execPath, [
    script,
    '--source', missingPath
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, false);
  assert.match(result.error, /not found/i);
  assert.match(result.next_step, /provide a local guizang-ppt-skill checkout or archive/i);
});
