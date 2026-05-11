import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildPptMasterPreflightResult,
  inspectPptMasterEnvironment
} from '../src/integrations/ppt-master.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'ppt-master-preflight.mjs');

const makePptMasterFixture = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-ppt-master-source-'));
  const scriptsDir = path.join(dir, 'skills', 'ppt-master', 'scripts');
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(path.join(scriptsDir, 'svg_to_pptx.py'), '# exporter placeholder\n', 'utf8');
  return dir;
};

test('inspectPptMasterEnvironment accepts a checkout with exporter and python-pptx', () => {
  const pptMasterPath = makePptMasterFixture();
  const calls = [];
  const result = inspectPptMasterEnvironment({
    pptMasterPath,
    pythonPath: 'python-ok',
    runPython: (pythonPath, args) => {
      calls.push({ pythonPath, args });
      if (args.includes('--version')) {
        return { status: 0, stdout: 'Python 3.12.13\n', stderr: '' };
      }
      return { status: 0, stdout: 'python-pptx import ok\n', stderr: '' };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.exporterFound, true);
  assert.equal(result.pythonExecutable, 'python-ok');
  assert.match(result.pythonVersion, /3\.12\.13/);
  assert.equal(result.pythonPptxImportOk, true);
  assert.equal(calls.length, 2);
});

test('inspectPptMasterEnvironment fails when python-pptx cannot import', () => {
  const pptMasterPath = makePptMasterFixture();
  const result = inspectPptMasterEnvironment({
    pptMasterPath,
    pythonPath: 'python-missing-pptx',
    runPython: (_pythonPath, args) => {
      if (args.includes('--version')) {
        return { status: 0, stdout: 'Python 3.12.13\n', stderr: '' };
      }
      return { status: 1, stdout: '', stderr: "ModuleNotFoundError: No module named 'pptx'\n" };
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.pythonFound, true);
  assert.equal(result.pythonPptxImportOk, false);
  assert.match(result.error, /python-pptx/i);
  assert.match(result.next_step, /install python-pptx/i);
});

test('buildPptMasterPreflightResult reports missing checkout paths with next step', () => {
  const missingPath = path.join(os.tmpdir(), 'missing-ppt-master-source');
  const result = buildPptMasterPreflightResult(missingPath);

  assert.equal(result.ok, false);
  assert.equal(result.checkoutFound, false);
  assert.match(result.error, /not found/i);
  assert.match(result.next_step, /provide a local ppt-master checkout/i);
});

test('ppt-master preflight script emits actionable json and exits non-zero', () => {
  const missingPath = path.join(os.tmpdir(), 'missing-ppt-master-cli');
  const run = spawnSync(process.execPath, [
    script,
    '--ppt-master-path', missingPath
  ], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  const result = JSON.parse(run.stdout);
  assert.equal(result.ok, false);
  assert.equal(result.checkoutFound, false);
  assert.match(result.next_step, /provide a local ppt-master checkout/i);
});
