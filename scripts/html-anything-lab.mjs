#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadHtmlAnythingLabRun } from '../src/lab/html-anything/run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const help = 'html-anything lab --template-index <path> --source <path> [--source <path>] [--workdir <path>] [--json]';
const args = process.argv.slice(2);
const resolveUserPath = (value) => path.resolve(process.cwd(), value);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${help}\n`);
  process.exit(0);
}

const options = { sourcePaths: [] };
for (let i = 0; i < args.length; i += 1) {
  const flag = args[i];
  if (flag === '--json') {
    options.json = true;
    continue;
  }
  const value = args[i + 1];
  if (!value || value.startsWith('--')) {
    process.stderr.write(`Missing value for ${flag}\n${help}\n`);
    process.exit(1);
  }
  if (flag === '--template-index') options.templateIndexPath = resolveUserPath(value);
  else if (flag === '--source') options.sourcePaths.push(resolveUserPath(value));
  else if (flag === '--workdir') options.workdir = resolveUserPath(value);
  else {
    process.stderr.write(`Unsupported option: ${flag}\n${help}\n`);
    process.exit(1);
  }
  i += 1;
}

if (!options.templateIndexPath) options.templateIndexPath = path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json');
if (options.sourcePaths.length === 0) {
  options.sourcePaths = [
    path.join(root, 'fixtures', 'generic-markdown', 'briefing.md'),
    path.join(root, 'fixtures', 'source-packages', 'publish-package', 'basic')
  ];
}
if (!options.workdir) options.workdir = root;

let result;
try {
  result = loadHtmlAnythingLabRun(options);
} catch (error) {
  process.stderr.write(`${error.message ?? String(error)}\n`);
  process.exit(1);
}
if (!result.ok) {
  process.stderr.write(`${result.error}\n`);
  process.exit(1);
}

process.stdout.write(`${options.json ? JSON.stringify(result, null, 2) : `written ${result.runDir}`}\n`);
