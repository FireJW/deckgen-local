import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { materializeLocalImageAssets } from '../src/assets/images.mjs';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lJ4QfQAAAABJRU5ErkJggg==',
  'base64'
);

const pngWithSize = (width, height) => {
  const png = Buffer.from(tinyPng);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
};

test('materializeLocalImageAssets rewrites image items when body is absent', () => {
  const sourceRoot = path.join(os.tmpdir(), `deckgen-item-image-source-${Date.now()}`);
  const assetsDir = path.join(sourceRoot, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(path.join(assetsDir, 'revenue bridge.png'), tinyPng);

  const sourcePath = path.join(sourceRoot, 'briefing.md');
  writeFileSync(sourcePath, '# Item image deck', 'utf8');
  const outputDir = path.join(os.tmpdir(), `deckgen-item-image-output-${Date.now()}`);
  mkdirSync(outputDir, { recursive: true });

  const contract = {
    title: 'Item Image Deck',
    slides: [{
      id: 's01',
      role: 'content',
      headline: 'Revenue bridge',
      items: [{
        kind: 'image',
        src: 'assets/revenue%20bridge.png',
        alt: 'Revenue bridge',
        evidence_refs: []
      }],
      evidence_refs: [],
      layout_intent: 'image'
    }]
  };

  const result = materializeLocalImageAssets({
    contract,
    sourcePath,
    outputDir
  });

  const copied = result.assets[0];
  assert.ok(copied);
  assert.ok(existsSync(copied.destinationPath));
  assert.deepEqual(readFileSync(copied.destinationPath), tinyPng);
  assert.match(result.contract.slides[0].items[0].src, /^assets\/images\/[^/]+\.png$/);
  assert.doesNotMatch(result.contract.slides[0].items[0].src, /revenue%20bridge\.png/);
});

test('materializeLocalImageAssets records copied local image dimensions', () => {
  const sourceRoot = path.join(os.tmpdir(), `deckgen-image-metadata-source-${Date.now()}`);
  const assetsDir = path.join(sourceRoot, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(path.join(assetsDir, 'wide-chart.png'), pngWithSize(1200, 600));

  const sourcePath = path.join(sourceRoot, 'briefing.md');
  writeFileSync(sourcePath, '# Image metadata deck', 'utf8');
  const outputDir = path.join(os.tmpdir(), `deckgen-image-metadata-output-${Date.now()}`);
  mkdirSync(outputDir, { recursive: true });

  const result = materializeLocalImageAssets({
    contract: {
      title: 'Image Metadata Deck',
      slides: [{
        id: 's01',
        role: 'content',
        headline: 'Wide chart',
        body: '![Wide chart](assets/wide-chart.png)',
        evidence_refs: [],
        layout_intent: 'image'
      }]
    },
    sourcePath,
    outputDir
  });

  assert.equal(result.assets[0].width, 1200);
  assert.equal(result.assets[0].height, 600);
  assert.equal(result.assets[0].aspectRatio, 2);
  assert.equal(result.assets[0].orientation, 'landscape');
});
