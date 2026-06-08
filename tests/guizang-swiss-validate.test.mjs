import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts', 'guizang-swiss-validate.mjs');

test('guizang Swiss validator wrapper accepts registered Swiss layouts', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-swiss-validate-'));
  const htmlPath = path.join(dir, 'index.html');
  writeFileSync(htmlPath, [
    '<!doctype html><html><body>',
    '<section class="slide accent" data-layout="SWISS-COVER-ASCII"><div class="canvas-card"><h2>Cover</h2></div></section>',
    '<section class="slide light" data-layout="S19"><div class="canvas-card"><h2>Claim</h2></div></section>',
    '</body></html>'
  ].join('\n'));

  const run = spawnSync(process.execPath, [script, htmlPath], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /PASS/);
});
