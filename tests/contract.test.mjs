import { strict as assert } from 'node:assert';
import { validateDeckContract } from '../src/contract/validate.mjs';
import { buildDeckPlan } from '../src/contract/planner.mjs';

const valid = {
  schema_version: 'deck-contract/v1',
  title: 'Sample deck',
  audience: 'internal briefing',
  profile: 'briefing',
  duration_minutes: 12,
  target_slide_count: 3,
  language: 'zh-CN',
  source_refs: [],
  hard_constraints: [],
  theme: { renderer_hint: 'indigo_porcelain', tone: 'research / AI / technology' },
  slides: [
    { id: 's01', role: 'cover', headline: 'Main claim', body: 'Frame', evidence_refs: [], layout_intent: 'hero_dark' }
  ],
  outputs: ['html']
};

assert.equal(validateDeckContract(valid).ok, true);
assert.equal(validateDeckContract(null).ok, false);
assert.equal(validateDeckContract({ ...valid, schema_version: 'deck-contract/v0' }).ok, false);
assert.equal(validateDeckContract({ ...valid, outputs: ['pdf'] }).ok, false);
assert.equal(validateDeckContract({ ...valid, slides: [] }).ok, false);
assert.equal(validateDeckContract({ ...valid, slides: 'not slides' }).ok, false);

const missingTitle = { ...valid };
delete missingTitle.title;
assert.equal(validateDeckContract(missingTitle).ok, false);

const plan = buildDeckPlan({
  title: 'Planned deck',
  audience: 'engineering',
  profile: 'learning',
  sourceText: ['# One', '# Two', '# Three', '# Four', '# Five', '# Six', '# Seven'].join('\n\n')
});

assert.equal(validateDeckContract(plan).ok, true);
assert.equal(plan.slides.length, 7);
assert.equal(plan.target_slide_count, 7);
assert.equal(plan.slides[0].role, 'cover');
assert.equal(plan.slides[1].layout_intent, 'text_split');
assert.equal(
  buildDeckPlan({ title: 'Briefing', audience: 'leadership', profile: 'briefing', sourceText: 'Point' }).slides[1].layout_intent,
  'evidence'
);
