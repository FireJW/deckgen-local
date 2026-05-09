import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src', 'cli', 'deckgen.mjs');

test('generate writes a run bundle with html and qc report', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'deckgen-local-'));
  const source = path.join(root, 'fixtures', 'generic-markdown', 'briefing.md');
  const run = spawnSync(process.execPath, [cli, 'generate', '--source', source, '--profile', 'briefing', '--output', 'html', '--workdir', tmp], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /written/);
  const runDir = run.stdout.match(/written (.+)$/m)[1].trim();
  const report = readFileSync(path.join(runDir, 'qc_report.md'), 'utf8');
  assert.match(report, /validation: PASS/);
  assert.ok(existsSync(path.join(runDir, 'request.json')));
  assert.ok(existsSync(path.join(runDir, 'content.md')));
  assert.ok(existsSync(path.join(runDir, 'deck_contract.json')));
  assert.ok(existsSync(path.join(runDir, 'html', 'index.html')));
});
