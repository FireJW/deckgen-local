import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { renderPptMasterDeck } from '../src/renderers/ppt-master/render.mjs';

test('renderPptMasterDeck requires pptMasterPath', () => {
  assert.throws(
    () => renderPptMasterDeck({ contract: { title: 'x', slides: [] }, config: {} }),
    /pptMasterPath/
  );
});

test('renderPptMasterDeck returns wrapper metadata when configured', () => {
  const result = renderPptMasterDeck({
    contract: { title: 'x', slides: [] },
    config: { pptMasterPath: 'D:/tools/ppt-master' },
    outputDir: 'D:/tmp/out'
  });
  assert.equal(result.projectDir, 'D:/tmp/out');
  assert.equal(result.exportsDir, 'D:/tmp/out/exports');
  assert.match(result.note, /not executed in Phase 1/);
});
