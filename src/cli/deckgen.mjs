#!/usr/bin/env node
const help = `deckgen generate --source <path> --profile briefing|learning|article --output html|pptx|both`;
const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h') || process.argv.length <= 2) {
  process.stdout.write(help + '\n');
  process.exit(0);
}

process.stdout.write('deckgen-local\n');
process.exit(0);
