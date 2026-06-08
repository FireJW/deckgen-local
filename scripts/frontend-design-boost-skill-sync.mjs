#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const repoSkillRoot = path.join(root, 'docs', 'frontend-design-boost', 'skill', 'frontend-design-boost');
const relativeFiles = [
  'SKILL.md',
  path.join('agents', 'openai.yaml'),
  path.join('references', 'companion-skills.md')
];
const syncLabel = 'asset-selection bridge';

const usage = [
  'frontend-design-boost-skill-sync [--apply] [--installed-skill <path>] [--codex-home <path>]',
  '',
  'Prepare or apply a safe sync from the repo skill draft into the installed Codex skill.',
  'The default mode is dry-run; it only prints the sync plan.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const readOption = (args, name) => {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  return value && !value.startsWith('--') ? value : null;
};

const candidateCodexHomes = () => {
  const candidates = [];
  if (process.env.CODEX_HOME) candidates.push(process.env.CODEX_HOME);
  candidates.push(path.resolve(root, '..', '..', 'AppData', 'codex'));
  if (process.env.APPDATA) candidates.push(path.join(path.dirname(process.env.APPDATA), 'codex'));
  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'codex'));
  if (process.platform === 'win32') {
    candidates.push(path.join(os.homedir(), 'AppData', 'codex'));
  }
  candidates.push(path.join(os.homedir(), '.codex'));
  return [...new Set(candidates.filter(Boolean).map((candidate) => path.resolve(candidate)))];
};

const resolveInstalledSkillRoot = (args) => {
  const explicitSkillRoot = readOption(args, '--installed-skill');
  if (explicitSkillRoot) return path.resolve(explicitSkillRoot);

  const explicitCodexHome = readOption(args, '--codex-home');
  const homes = explicitCodexHome ? [path.resolve(explicitCodexHome)] : candidateCodexHomes();
  for (const home of homes) {
    const skillRoot = path.join(home, 'skills', 'frontend-design-boost');
    if (existsSync(skillRoot)) return skillRoot;
  }
  return path.join(homes[0] ?? path.join(os.homedir(), '.codex'), 'skills', 'frontend-design-boost');
};

const readNormalized = (filePath) => readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const safeStat = (filePath) => {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
};

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const apply = args.includes('--apply');
const installedSkillRoot = resolveInstalledSkillRoot(args);
const backupRoot = path.join(installedSkillRoot, '.frontend-design-boost-sync-backups', new Date().toISOString().replace(/[:.]/g, '-'));

const filePlan = relativeFiles.map((relativeFile) => {
  const source = path.join(repoSkillRoot, relativeFile);
  const destination = path.join(installedSkillRoot, relativeFile);
  const sourceExists = existsSync(source);
  const destinationExists = existsSync(destination);
  const sourceText = sourceExists ? readNormalized(source) : '';
  const destinationText = destinationExists ? readNormalized(destination) : '';
  const needsCopy = sourceExists && (!destinationExists || sourceText !== destinationText);
  return {
    relativeFile,
    source,
    destination,
    sourceExists,
    destinationExists,
    upToDate: sourceExists && destinationExists && sourceText === destinationText,
    needsCopy,
    backupPath: needsCopy ? path.join(backupRoot, relativeFile) : ''
  };
});

const missingSources = filePlan.filter((item) => !item.sourceExists);
if (missingSources.length > 0) {
  fail(`Missing repo skill file: ${missingSources.map((item) => item.relativeFile).join(', ')}`);
}

if (apply) {
  for (const item of filePlan) {
    if (item.needsCopy && item.destinationExists) {
      mkdirSync(path.dirname(item.backupPath), { recursive: true });
      copyFileSync(item.destination, item.backupPath);
    }
    if (item.needsCopy) {
      mkdirSync(path.dirname(item.destination), { recursive: true });
      copyFileSync(item.source, item.destination);
    }
  }
}

const result = {
  ok: true,
  syncLabel,
  dryRun: !apply,
  applied: apply,
  repoSkillRoot,
  installedSkillRoot,
  backupRoot: apply ? backupRoot : '',
  filePlan,
  notes: [
    'Default mode is dry-run so the installed skill is never modified unless --apply is explicit.',
    'Use this after repo-local skill changes so the installed skill picks up the same workflow markers and bridge artifacts.',
    'This sync helper is separate from the drift check so validation stays read-only.'
  ]
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
