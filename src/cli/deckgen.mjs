#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { buildGenericMarkdownPackage } from '../adapters/generic-markdown.mjs';
import { allowedCliOutputModes, allowedProfiles } from '../contract/schema.mjs';
import {
  DeckgenUserError,
  failIfPptxRequested,
  normalizeOutputs,
  writeGenerateBundle
} from './generate.mjs';

const help = `deckgen generate --source <path> --profile briefing|learning|article --output html|pptx|both [--workdir <path>]`;
const args = process.argv.slice(2);
const [command] = args;
const isHelpFlag = (token) => token === '--help' || token === '-h';

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
  try {
    failIfPptxRequested(concreteOutputs);
  } catch (error) {
    if (error instanceof DeckgenUserError) {
      fail(error.message);
    }

    throw error;
  }

  const deckPackage = buildGenericMarkdownPackage({
    sourcePath: options.source,
    markdown,
    profile: options.profile
  });
  const contract = {
    ...deckPackage.contract,
    outputs: concreteOutputs
  };
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

  try {
    const { runDir } = writeGenerateBundle({
      workdir: options.workdir,
      request,
      sourceManifest,
      content: deckPackage.content,
      contract,
      sourcePath: options.source
    });
    process.stdout.write(`written ${runDir}\n`);
  } catch (error) {
    if (error instanceof DeckgenUserError) {
      fail(error.message);
    }

    throw error;
  }
};

if (!command || isHelpFlag(command)) {
  if (isHelpFlag(command)) {
    process.stdout.write(help + '\n');
    process.exit(0);
  }

  fail('Missing command.');
}

if (command === 'generate') {
  if (args.slice(1).some(isHelpFlag)) {
    process.stdout.write(help + '\n');
    process.exit(0);
  }

  commandGenerate(args.slice(1));
  process.exit(0);
}

fail(`Unsupported command: ${command}`);
