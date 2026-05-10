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
