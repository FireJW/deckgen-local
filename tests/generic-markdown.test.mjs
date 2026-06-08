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
  assert.deepEqual(result.contract.source_refs, [{ type: 'local_file', path: sourcePath, role: 'primary', id: 'primary' }]);
  assert.deepEqual(result.contract.slides[0].evidence_refs, []);
  assert.ok(result.contract.slides.slice(1).every((slide) =>
    JSON.stringify(slide.evidence_refs) === JSON.stringify([{ id: `${slide.id}-source`, source_ref: 'primary' }])
  ));
  assert.ok(result.contract.slides.slice(1).every((slide) =>
    slide.items.every((item, index) =>
      JSON.stringify(item.evidence_refs) === JSON.stringify([{ id: `${slide.id}-item-${index + 1}-source`, source_ref: 'primary' }])
    )
  ));
  assert.ok(result.contract.slides.slice(1).every((slide) => {
    const ids = [
      ...slide.evidence_refs,
      ...slide.items.flatMap((item) => item.evidence_refs)
    ].map((ref) => ref.id);
    return new Set(ids).size === ids.length;
  }));
  assert.equal(validateDeckContract(result.contract).ok, true);
  assert.ok(result.content.includes('Why this matters'));
});

test('buildGenericMarkdownPackage carries supported YAML frontmatter into the contract', () => {
  const sourcePath = path.join(root, 'fixtures', 'generic-markdown', 'swiss-briefing.md');
  const md = [
    '---',
    'title: Swiss Briefing',
    'theme:',
    '  renderer_hint: swiss-ikb',
    '  tone: analytical / investor',
    '---',
    '',
    '# Swiss Briefing',
    '',
    '## Strategic Claim',
    '',
    'The deck should preview and export with the same Swiss visual system.'
  ].join('\n');

  const result = buildGenericMarkdownPackage({ sourcePath, markdown: md, profile: 'briefing' });

  assert.equal(result.contract.title, 'Swiss Briefing');
  assert.equal(result.contract.theme.renderer_hint, 'swiss-ikb');
  assert.equal(result.contract.theme.tone, 'analytical / investor');
  assert.equal(result.content.startsWith('# Swiss Briefing'), true);
  assert.doesNotMatch(result.content, /^---/);
  assert.equal(validateDeckContract(result.contract).ok, true);
});
