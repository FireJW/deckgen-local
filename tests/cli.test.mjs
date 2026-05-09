import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src', 'cli', 'deckgen.mjs');

const runCli = (args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('prints help', () => {
  const help = runCli(['--help']);

  assert.equal(help.status, 0);
  assert.match(help.stdout, /deckgen generate/);
  assert.match(help.stdout, /--source/);
  assert.match(help.stdout, /--output/);
});

test('unsupported command exits non-zero with stderr', () => {
  const result = runCli(['preview']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported command|usage/i);
});

test('unsupported command with help exits non-zero with stderr', () => {
  const result = runCli(['preview', '--help']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported command|usage/i);
});

test('generate exits non-zero when source is missing', () => {
  const result = runCli(['generate', '--source', 'missing.md', '--profile', 'briefing', '--output', 'html']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source file not found/i);
});
