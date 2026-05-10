import { strict as assert } from 'node:assert';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadSourcePackage } from '../src/cli/source-loader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdownSource = path.join(root, 'fixtures', 'generic-markdown', 'briefing.md');
const articlePackageSource = path.join(root, 'fixtures', 'source-packages', 'article', 'basic');
const publishPackageSource = path.join(root, 'fixtures', 'source-packages', 'publish-package', 'basic');
const obsidianReadingLabSource = path.join(root, 'fixtures', 'source-packages', 'obsidian-reading-lab', 'basic');

test('loadSourcePackage preserves markdown file fallback behavior', () => {
  const loaded = loadSourcePackage({ source: markdownSource, profile: 'learning' });

  assert.equal(loaded.sourceType, 'generic-markdown');
  assert.equal(loaded.profile, 'learning');
  assert.equal(loaded.contract.profile, 'learning');
  assert.equal(loaded.sourcePath, markdownSource);
  assert.equal(loaded.sourceManifest.primary.path, markdownSource);
  assert.ok(loaded.sourceManifest.primary.bytes > 0);
});

test('loadSourcePackage detects article package directories from deckgen.source.json', () => {
  const loaded = loadSourcePackage({ source: articlePackageSource });

  assert.equal(loaded.sourceType, 'article-package');
  assert.equal(loaded.profile, 'article');
  assert.equal(loaded.contract.profile, 'article');
  assert.equal(loaded.contract.title, 'Detected Article Package');
  assert.equal(loaded.sourceManifest.type, 'article-package');
  assert.equal(loaded.sourceManifest.manifest.path, path.join(articlePackageSource, 'deckgen.source.json'));
  assert.equal(loaded.sourceManifest.primary.path, path.join(articlePackageSource, 'content.md'));
});

test('loadSourcePackage detects publish-package/v1 directories from publish-package.json', () => {
  const loaded = loadSourcePackage({ source: publishPackageSource });

  assert.equal(loaded.sourceType, 'publish-package');
  assert.equal(loaded.profile, 'article');
  assert.equal(loaded.contract.profile, 'article');
  assert.equal(loaded.contract.title, 'Publish Package Deck');
  assert.deepEqual(loaded.contract.outputs, ['html', 'pptx']);
  assert.equal(loaded.sourceManifest.type, 'publish-package');
  assert.equal(loaded.sourceManifest.contract_version, 'publish-package/v1');
  assert.equal(loaded.sourceManifest.primary.path, path.join(publishPackageSource, 'publish-package.json'));
  assert.match(loaded.content, /Ready article packages already contain grounded Markdown/);
});

test('loadSourcePackage detects Obsidian reading-lab preview packages', () => {
  const loaded = loadSourcePackage({ source: obsidianReadingLabSource });

  assert.equal(loaded.sourceType, 'obsidian-reading-lab');
  assert.equal(loaded.profile, 'learning');
  assert.equal(loaded.contract.profile, 'learning');
  assert.equal(loaded.contract.title, 'hello-agents - Chapter 4: ReAct');
  assert.equal(loaded.sourceManifest.type, 'obsidian-reading-lab');
  assert.equal(loaded.sourceManifest.schema, 'agent_reading_lab/v1');
  assert.equal(loaded.sourceManifest.primary.path, path.join(obsidianReadingLabSource, 'index.md'));
  assert.equal(loaded.sourceManifest.manifest.path, path.join(obsidianReadingLabSource, 'agent-reading-lab.json'));
  assert.match(loaded.content, /Read Thought, Action, and Observation as a grounded loop/);
});

test('loadSourcePackage rejects explicit profile conflicts for publish packages', () => {
  assert.throws(
    () => loadSourcePackage({ source: publishPackageSource, profile: 'briefing' }),
    /profile briefing conflicts with publish-package profile article/i
  );
});

test('loadSourcePackage rejects explicit profile conflicts for Obsidian reading-lab packages', () => {
  assert.throws(
    () => loadSourcePackage({ source: obsidianReadingLabSource, profile: 'article' }),
    /profile article conflicts with obsidian-reading-lab profile learning/i
  );
});

test('loadSourcePackage rejects explicit profile conflicts for typed packages', () => {
  assert.throws(
    () => loadSourcePackage({ source: articlePackageSource, profile: 'briefing' }),
    /profile briefing conflicts with article-package profile article/i
  );
});

test('loadSourcePackage rejects directories without a source manifest', () => {
  const emptyDir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-empty-source-'));

  assert.throws(
    () => loadSourcePackage({ source: emptyDir }),
    /deckgen\.source\.json/i
  );
});
