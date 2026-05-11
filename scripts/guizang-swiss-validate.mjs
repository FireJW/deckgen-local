#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validator = path.join(root, 'third_party', 'guizang-ppt-skill', 'scripts', 'validate-swiss-deck.mjs');
const htmlPath = process.argv[2] ? path.resolve(process.argv[2]) : '';

if (!htmlPath) {
  process.stderr.write('Usage: guizang-swiss-validate <html-path>\n');
  process.exit(2);
}

if (!existsSync(htmlPath)) {
  process.stderr.write(`HTML file not found: ${htmlPath}\n`);
  process.exit(1);
}

if (!existsSync(validator)) {
  process.stderr.write(`Swiss validator not found: ${validator}\n`);
  process.exit(1);
}

const run = spawnSync(process.execPath, [validator, htmlPath], { encoding: 'utf8' });
if (run.stdout) process.stdout.write(run.stdout);
if (run.stderr) process.stderr.write(run.stderr);
if (run.status !== 0) process.exit(run.status ?? 1);

process.stdout.write(`PASS Swiss validator: ${htmlPath}\n`);
