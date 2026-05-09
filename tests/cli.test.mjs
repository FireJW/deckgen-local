import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src', 'cli', 'deckgen.mjs');

const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
assert.equal(help.status, 0);
assert.match(help.stdout, /deckgen generate/);
assert.match(help.stdout, /--source/);
assert.match(help.stdout, /--output/);
