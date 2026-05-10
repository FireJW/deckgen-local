import { strict as assert } from 'node:assert';
import test from 'node:test';
import { buildDeckPlan } from '../src/contract/planner.mjs';
import * as schema from '../src/contract/schema.mjs';
import { validateDeckContract } from '../src/contract/validate.mjs';

const validSlide = () => ({
  id: 's01',
  role: 'cover',
  headline: 'Main claim',
  body: 'Frame',
  evidence_refs: [],
  layout_intent: 'hero_dark'
});

const validContract = () => ({
  schema_version: 'deck-contract/v1',
  title: 'Sample deck',
  audience: 'internal briefing',
  profile: 'briefing',
  duration_minutes: 12,
  target_slide_count: 1,
  language: 'zh-CN',
  source_refs: [],
  hard_constraints: [],
  theme: { renderer_hint: 'indigo_porcelain', tone: 'research / AI / technology' },
  slides: [validSlide()],
  outputs: ['html']
});

const malformedContracts = [
  ['null contract', () => null],
  ['symbol schema_version', () => ({ ...validContract(), schema_version: Symbol('deck-contract/v1') })],
  ['empty schema_version', () => ({ ...validContract(), schema_version: '' })],
  ['empty title', () => ({ ...validContract(), title: '   ' })],
  ['non-string audience', () => ({ ...validContract(), audience: 42 })],
  ['invalid profile', () => ({ ...validContract(), profile: 'sales' })],
  ['empty language', () => ({ ...validContract(), language: '' })],
  ['non-integer duration_minutes', () => ({ ...validContract(), duration_minutes: 1.5 })],
  ['zero duration_minutes', () => ({ ...validContract(), duration_minutes: 0 })],
  ['non-integer target_slide_count', () => ({ ...validContract(), target_slide_count: 1.5 })],
  ['target_slide_count mismatch', () => ({ ...validContract(), target_slide_count: 2 })],
  ['source_refs is not an array', () => ({ ...validContract(), source_refs: {} })],
  ['source_refs item is null', () => ({ ...validContract(), source_refs: [null] })],
  ['source_refs item type is empty', () => ({ ...validContract(), source_refs: [{ type: ' ', path: 'D:/source.md', role: 'primary' }] })],
  ['source_refs item path is empty', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: '', role: 'primary' }] })],
  ['source_refs item role is not a string', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 3 }] })],
  ['source_refs item has unexpected key', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary', extra: true }] })],
  ['hard_constraints is not an array', () => ({ ...validContract(), hard_constraints: 'none' })],
  ['theme is null', () => ({ ...validContract(), theme: null })],
  ['theme renderer_hint is empty', () => ({ ...validContract(), theme: { renderer_hint: ' ' } })],
  ['theme tone is not a string', () => ({ ...validContract(), theme: { renderer_hint: 'clean', tone: 3 } })],
  ['outputs is empty', () => ({ ...validContract(), outputs: [] })],
  ['outputs contains both', () => ({ ...validContract(), outputs: ['both'] })],
  ['outputs contains duplicates', () => ({ ...validContract(), outputs: ['html', 'html'] })],
  ['outputs contains unknown mode', () => ({ ...validContract(), outputs: ['pdf'] })],
  ['slides is empty', () => ({ ...validContract(), target_slide_count: 0, slides: [] })],
  ['slide is null', () => ({ ...validContract(), slides: [null] })],
  ['slide id is empty', () => ({ ...validContract(), slides: [{ ...validSlide(), id: '' }] })],
  ['slide role is not a string', () => ({ ...validContract(), slides: [{ ...validSlide(), role: 1 }] })],
  ['slide headline is empty', () => ({ ...validContract(), slides: [{ ...validSlide(), headline: ' ' }] })],
  ['slide layout_intent is empty', () => ({ ...validContract(), slides: [{ ...validSlide(), layout_intent: '' }] })],
  ['slide body is not a string', () => ({ ...validContract(), slides: [{ ...validSlide(), body: 7 }] })],
  ['slide evidence_refs is not an array', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: null }] })],
  ['slide evidence_refs item is empty', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [' '] }] })],
  ['slide evidence_refs object item is missing id', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ source_ref: 'primary' }] }] })],
  ['slide evidence_refs object item has unexpected key', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1', extra: true }] }] })],
  ['slide evidence_refs object source_ref is unknown', () => ({
    ...validContract(),
    source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary', id: 'primary' }],
    slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1', source_ref: 'missing-source' }] }]
  })]
];

const invalidPlannerInputs = [
  ['undefined input', undefined, /options object/i],
  ['empty title', { title: ' ', audience: 'leadership', profile: 'briefing', sourceText: 'Point' }, /title/i],
  ['empty audience', { title: 'Briefing', audience: '', profile: 'briefing', sourceText: 'Point' }, /audience/i],
  ['invalid profile', { title: 'Briefing', audience: 'leadership', profile: 'sales', sourceText: 'Point' }, /profile/i],
  ['missing sourceText', { title: 'Briefing', audience: 'leadership', profile: 'briefing' }, /sourceText/i],
  ['non-string sourceText', { title: 'Briefing', audience: 'leadership', profile: 'briefing', sourceText: ['Point'] }, /sourceText/i]
];

test('schema exports contract outputs and CLI output modes separately', () => {
  assert.deepEqual(schema.allowedOutputs, ['html', 'pptx']);
  assert.deepEqual(schema.allowedCliOutputModes, ['html', 'pptx', 'both']);
});

test('validateDeckContract accepts a valid deck contract', () => {
  assert.deepEqual(validateDeckContract(validContract()), { ok: true });
  assert.deepEqual(validateDeckContract({ ...validContract(), outputs: ['html', 'pptx'] }), { ok: true });
  assert.deepEqual(validateDeckContract({
    ...validContract(),
    source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary', id: 'primary' }],
    slides: [{ ...validSlide(), evidence_refs: ['primary', { id: 'ev1', source_ref: 'primary' }] }]
  }), { ok: true });
});

test('validateDeckContract rejects unexpected top-level keys', () => {
  const result = validateDeckContract({ ...validContract(), unexpected: 'field' });

  assert.equal(result.ok, false);
  assert.match(result.error, /unexpected top-level key/);
});

test('validateDeckContract rejects malformed data without throwing', () => {
  for (const [name, makeContract] of malformedContracts) {
    let result;

    assert.doesNotThrow(() => {
      result = validateDeckContract(makeContract());
    }, name);

    assert.equal(result.ok, false, name);
    assert.equal(typeof result.error, 'string', name);
    assert.notEqual(result.error.trim(), '', name);
  }
});

test('buildDeckPlan creates a valid plan from valid input', () => {
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
});

test('buildDeckPlan uses evidence layout for briefing profile', () => {
  const plan = buildDeckPlan({
    title: 'Briefing',
    audience: 'leadership',
    profile: 'briefing',
    sourceText: 'Point'
  });

  assert.equal(plan.slides[1].layout_intent, 'evidence');
});

test('buildDeckPlan rejects invalid inputs with clear errors', () => {
  for (const [name, input, message] of invalidPlannerInputs) {
    assert.throws(() => buildDeckPlan(input), message, name);
  }
});
