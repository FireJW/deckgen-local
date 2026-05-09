#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildGenericMarkdownPackage } from '../adapters/generic-markdown.mjs';
import { allowedCliOutputModes, allowedProfiles } from '../contract/schema.mjs';
import { validateDeckContract } from '../contract/validate.mjs';
import { buildQcReport } from '../qc/report.mjs';
import { renderHtmlDeck } from '../renderers/html-guizang/render.mjs';

const help = `deckgen generate --source <path> --profile briefing|learning|article --output html|pptx|both [--workdir <path>]`;
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(help + '\n');
  process.exit(0);
}

const [command] = args;

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${help}\n`);
  process.exit(1);
};

const parseGenerateFlags = (tokens) => {
  const options = {
    profile: 'briefing',
    output: 'html',
    workdir: process.cwd()
  };

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];

    if (!flag?.startsWith('--')) {
      fail(`Unexpected argument: ${flag ?? ''}`);
    }

    if (value === undefined || value.startsWith('--')) {
      fail(`Missing value for ${flag}.`);
    }

    if (!['--source', '--profile', '--output', '--workdir'].includes(flag)) {
      fail(`Unsupported option: ${flag}`);
    }

    options[flag.slice(2)] = value;
  }

  return options;
};

const normalizeOutputs = (output) => output === 'both' ? ['html', 'pptx'] : [output];

const timestampRunId = () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${timestamp}-${randomUUID().slice(0, 8)}`;
};

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const commandGenerate = (tokens) => {
  const options = parseGenerateFlags(tokens);

  if (!options.source) {
    fail('Missing required option: --source.');
  }

  if (!allowedProfiles.includes(options.profile)) {
    fail(`Invalid profile: ${options.profile}. Expected one of ${allowedProfiles.join(', ')}.`);
  }

  if (!allowedCliOutputModes.includes(options.output)) {
    fail(`Invalid output: ${options.output}. Expected one of ${allowedCliOutputModes.join(', ')}.`);
  }

  let sourceStat;
  try {
    sourceStat = statSync(options.source);
  } catch {
    fail(`Source file not found: ${options.source}`);
  }

  if (!sourceStat.isFile()) {
    fail(`Source is not a file: ${options.source}`);
  }

  const markdown = readFileSync(options.source, 'utf8');
  const concreteOutputs = normalizeOutputs(options.output);
  const deckPackage = buildGenericMarkdownPackage({
    sourcePath: options.source,
    markdown,
    profile: options.profile
  });
  const contract = {
    ...deckPackage.contract,
    outputs: concreteOutputs
  };
  const validation = validateDeckContract(contract);

  const runDir = path.resolve(options.workdir, '.tmp', 'deckgen', timestampRunId());
  mkdirSync(runDir, { recursive: true });

  const request = {
    command: 'generate',
    source: options.source,
    profile: options.profile,
    output: options.output,
    outputs: concreteOutputs,
    workdir: options.workdir
  };
  const sourceManifest = {
    primary: {
      path: options.source,
      bytes: sourceStat.size,
      modified_at: sourceStat.mtime.toISOString()
    }
  };

  writeJson(path.join(runDir, 'request.json'), request);
  writeJson(path.join(runDir, 'source_manifest.json'), sourceManifest);
  writeFileSync(path.join(runDir, 'content.md'), deckPackage.content, 'utf8');
  writeJson(path.join(runDir, 'deck_contract.json'), contract);

  let htmlPath = '';
  if (concreteOutputs.includes('html')) {
    const htmlDir = path.join(runDir, 'html');
    mkdirSync(htmlDir, { recursive: true });
    htmlPath = path.join(htmlDir, 'index.html');
    writeFileSync(htmlPath, renderHtmlDeck(contract), 'utf8');
  }

  writeFileSync(path.join(runDir, 'qc_report.md'), buildQcReport({
    sourcePath: options.source,
    validation,
    htmlPath
  }), 'utf8');

  if (!validation.ok) {
    fail(`Deck contract validation failed: ${validation.error}`);
  }

  process.stdout.write(`written ${runDir}\n`);
};

if (!command) {
  fail('Missing command.');
}

if (command === 'generate') {
  commandGenerate(args.slice(1));
  process.exit(0);
}

fail(`Unsupported command: ${command}`);
