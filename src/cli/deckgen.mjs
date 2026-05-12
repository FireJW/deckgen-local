#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { allowedCliOutputModes, allowedProfiles } from '../contract/schema.mjs';
import {
  DeckgenUserError,
  failIfPptxRequested,
  normalizeOutputs,
  writeGenerateBundle
} from './generate.mjs';
import { loadSourcePackage } from './source-loader.mjs';

const help = `deckgen generate --source <path> --profile briefing|learning|article --output html|pptx|both [--theme <renderer-hint>] [--workdir <path>] [--ppt-master-path <path>] [--json]`;
const args = process.argv.slice(2);
const [command] = args;
const isHelpFlag = (token) => token === '--help' || token === '-h';

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${help}\n`);
  process.exit(1);
};

const parseGenerateFlags = (tokens) => {
  const options = {
    output: 'html',
    workdir: process.cwd()
  };
  const flagMap = new Map([
    ['--source', 'source'],
    ['--profile', 'profile'],
    ['--output', 'output'],
    ['--theme', 'theme'],
    ['--workdir', 'workdir'],
    ['--ppt-master-path', 'pptMasterPath']
  ]);

  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];

    if (!flag?.startsWith('--')) {
      fail(`Unexpected argument: ${flag ?? ''}`);
    }

    if (flag === '--json') {
      options.json = true;
      continue;
    }

    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`Missing value for ${flag}.`);
    }

    const optionKey = flagMap.get(flag);
    if (!optionKey) {
      fail(`Unsupported option: ${flag}`);
    }

    options[optionKey] = value;
    index += 1;
  }

  return options;
};

const resolvePptMasterPath = (options) => {
  if (options.pptMasterPath) {
    return path.resolve(options.pptMasterPath);
  }

  if (process.env.DECKGEN_PPT_MASTER_PATH) {
    return path.resolve(process.env.DECKGEN_PPT_MASTER_PATH);
  }

  const candidates = [
    path.resolve(process.cwd(), '..', 'ppt-master'),
    path.resolve(process.cwd(), 'ppt-master')
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? '';
};

const commandGenerate = (tokens) => {
  const options = parseGenerateFlags(tokens);

  if (!options.source) {
    fail('Missing required option: --source.');
  }

  if (options.profile !== undefined && !allowedProfiles.includes(options.profile)) {
    fail(`Invalid profile: ${options.profile}. Expected one of ${allowedProfiles.join(', ')}.`);
  }

  if (!allowedCliOutputModes.includes(options.output)) {
    fail(`Invalid output: ${options.output}. Expected one of ${allowedCliOutputModes.join(', ')}.`);
  }

  let sourcePackage;
  try {
    sourcePackage = loadSourcePackage({
      source: options.source,
      profile: options.profile
    });
  } catch (error) {
    if (error instanceof DeckgenUserError) {
      fail(error.message);
    }
    throw error;
  }

  const concreteOutputs = normalizeOutputs(options.output);
  const pptMasterPath = resolvePptMasterPath(options);
  const config = {
    pptMasterPath,
    pythonPath: process.env.DECKGEN_PPT_MASTER_PYTHON
  };
  try {
    failIfPptxRequested(concreteOutputs, config);
  } catch (error) {
    if (error instanceof DeckgenUserError) {
      fail(error.message);
    }

    throw error;
  }

  const contract = {
    ...sourcePackage.contract,
    theme: options.theme
      ? {
          ...sourcePackage.contract.theme,
          renderer_hint: options.theme
        }
      : sourcePackage.contract.theme,
    outputs: concreteOutputs
  };
  const request = {
    command: 'generate',
    source: options.source,
    source_type: sourcePackage.sourceType,
    profile: sourcePackage.profile,
    output: options.output,
    outputs: concreteOutputs,
    ...(options.theme ? { theme: options.theme } : {}),
    workdir: options.workdir,
    pptMasterPath
  };

  try {
    const { runDir, htmlPath, pptxPaths } = writeGenerateBundle({
      workdir: options.workdir,
      request,
      sourceManifest: sourcePackage.sourceManifest,
      content: sourcePackage.content,
      contract,
      sourcePath: sourcePackage.sourcePath,
      config
    });
    if (options.json) {
      process.stdout.write(`${JSON.stringify({
        ok: true,
        command: 'generate',
        source_type: sourcePackage.sourceType,
        profile: sourcePackage.profile,
        output: options.output,
        outputs: concreteOutputs,
        runDir,
        htmlPath,
        pptxPaths,
        qcReportPath: path.join(runDir, 'qc_report.md')
      }, null, 2)}\n`);
      return;
    }

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
