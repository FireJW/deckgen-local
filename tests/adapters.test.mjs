import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildArticlePackageDeck } from '../src/adapters/article-package.mjs';
import { buildResearchReportDeck } from '../src/adapters/research-report.mjs';
import { buildObsidianNoteDeck } from '../src/adapters/obsidian-note.mjs';
import { validateDeckContract } from '../src/contract/validate.mjs';

test('article package adapter builds article deck with html and pptx contract outputs', () => {
  const result = buildArticlePackageDeck({
    title: 'Article Pack',
    sourcePath: 'D:/Users/rickylu/dev/financial-services-plugins-clean/.tmp/package/request.md',
    markdown: '# Article Pack\n\nOne sentence.'
  });

  assert.equal(result.contract.title, 'Article Pack');
  assert.equal(result.contract.profile, 'article');
  assert.deepEqual(result.contract.outputs, ['html', 'pptx']);
  assert.equal(validateDeckContract(result.contract).ok, true);
});

test('research report adapter defaults to briefing profile', () => {
  const result = buildResearchReportDeck({
    sourcePath: 'D:/Users/rickylu/dev/financial-services-plugins/report.md',
    markdown: '# Research Report\n\nMain point.'
  });

  assert.equal(result.contract.profile, 'briefing');
  assert.deepEqual(result.contract.outputs, ['html']);
  assert.equal(validateDeckContract(result.contract).ok, true);
});

test('obsidian note adapter defaults to learning profile', () => {
  const result = buildObsidianNoteDeck({
    sourcePath: 'D:/Users/rickylu/dev/obsidian-kb-v2/wiki/note.md',
    markdown: '# Learning Note\n\nConcept.'
  });

  assert.equal(result.contract.profile, 'learning');
  assert.equal(result.contract.theme.renderer_hint, 'ink_classic');
  assert.equal(validateDeckContract(result.contract).ok, true);
});

test('adapter title override updates cover slide headline', () => {
  const result = buildArticlePackageDeck({
    title: 'Override Title',
    sourcePath: 'D:/Users/rickylu/dev/financial-services-plugins-clean/.tmp/package/request.md',
    markdown: '# Markdown Title\n\nOne sentence.'
  });

  assert.equal(result.contract.title, 'Override Title');
  assert.equal(result.contract.slides[0].headline, 'Override Title');
  assert.equal(validateDeckContract(result.contract).ok, true);
});
