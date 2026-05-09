import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGenericMarkdownPackage } from '../src/adapters/generic-markdown.mjs';
import { validateDeckContract } from '../src/contract/validate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('buildGenericMarkdownPackage builds valid content and contract', () => {
  const sourcePath = path.join(root, 'fixtures', 'generic-markdown', 'briefing.md');
  const md = readFileSync(sourcePath, 'utf8');
  const result = buildGenericMarkdownPackage({ sourcePath, markdown: md, profile: 'briefing' });

  assert.equal(result.contract.title, 'Deck Generator Briefing');
  assert.equal(result.contract.slides[0].role, 'cover');
  assert.equal(validateDeckContract(result.contract).ok, true);
  assert.ok(result.content.includes('Why this matters'));
});
