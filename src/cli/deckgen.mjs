#!/usr/bin/env node
const help = `deckgen generate --source <path> --profile briefing|learning|article --output html|pptx|both`;
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(help + '\n');
  process.exit(0);
}

const [command] = args;

if (!command) {
  process.stderr.write(`Missing command.\nUsage: ${help}\n`);
  process.exit(1);
}

if (command === 'generate') {
  process.stderr.write(`The generate command is not implemented yet.\nUsage: ${help}\n`);
  process.exit(1);
}

process.stderr.write(`Unsupported command: ${command}\nUsage: ${help}\n`);
process.exit(1);
