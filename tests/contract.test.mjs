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
  ['source_refs item type must be local_file', () => ({ ...validContract(), source_refs: [{ type: 'remote_url', path: 'D:/source.md', role: 'primary' }] })],
  ['source_refs item path is empty', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: '', role: 'primary' }] })],
  ['source_refs item path must be absolute', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: 'relative/source.md', role: 'primary' }] })],
  ['source_refs item role is not a string', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 3 }] })],
  ['source_refs item has unexpected key', () => ({ ...validContract(), source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary', extra: true }] })],
  ['source_refs item has duplicate id', () => ({
    ...validContract(),
    source_refs: [
      { type: 'local_file', path: 'D:/source-a.md', role: 'primary', id: 'main' },
      { type: 'local_file', path: 'D:/source-b.md', role: 'supporting', id: 'main' }
    ]
  })],
  ['source_refs item has duplicate path', () => ({
    ...validContract(),
    source_refs: [
      { type: 'local_file', path: 'D:/source.md', role: 'primary', id: 'main' },
      { type: 'local_file', path: 'D:/source.md', role: 'supporting', id: 'supporting' }
    ]
  })],
  ['source_refs item has duplicate role', () => ({
    ...validContract(),
    source_refs: [
      { type: 'local_file', path: 'D:/source-a.md', role: 'primary', id: 'main-a' },
      { type: 'local_file', path: 'D:/source-b.md', role: 'primary', id: 'main-b' }
    ]
  })],
  ['source_refs item id collides with another role', () => ({
    ...validContract(),
    source_refs: [
      { type: 'local_file', path: 'D:/source-a.md', role: 'primary', id: 'main-a' },
      { type: 'local_file', path: 'D:/source-b.md', role: 'supporting', id: 'primary' }
    ]
  })],
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
  ['slide evidence_refs string item is unknown', () => ({
    ...validContract(),
    source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary', id: 'main' }],
    slides: [{ ...validSlide(), evidence_refs: ['missing-source'] }]
  })],
  ['slide evidence_refs object item is missing id', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ source_ref: 'primary' }] }] })],
  ['slide evidence_refs object item has no source locator or quote', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1' }] }] })],
  ['slide evidence_refs object item has unexpected key', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1', extra: true }] }] })],
  ['slide evidence_refs object item has duplicate id', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1' }, { id: 'ev1' }] }] })],
  ['slide evidence_refs object locator is empty', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1', locator: ' ' }] }] })],
  ['slide evidence_refs object quote is not a string', () => ({ ...validContract(), slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1', quote: 3 }] }] })],
  ['slide evidence_refs object source_ref must be a source_refs id', () => ({
    ...validContract(),
    source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary', id: 'primary' }],
    slides: [{ ...validSlide(), evidence_refs: [{ id: 'ev1', source_ref: 'D:/source.md', quote: 'Verified claim.' }] }]
  })],
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
    slides: [{ ...validSlide(), evidence_refs: ['primary', { id: 'ev1', source_ref: 'primary', locator: 'p. 2', quote: 'Verified claim.' }] }]
  }), { ok: true });
  assert.deepEqual(validateDeckContract({
    ...validContract(),
    source_refs: [{ type: 'local_file', path: 'D:/source.md', role: 'primary' }],
    slides: [{ ...validSlide(), evidence_refs: ['D:/source.md'] }]
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

test('buildDeckPlan splits Windows CRLF markdown sections into separate slides', () => {
  const plan = buildDeckPlan({
    title: 'Windows report',
    audience: 'leadership',
    profile: 'briefing',
    sourceText: [
      '# Executive Summary',
      '- one',
      '',
      '## Signals',
      '- two',
      '',
      '## Actions',
      '- three'
    ].join('\r\n')
  });

  assert.equal(plan.target_slide_count, 4);
  assert.deepEqual(
    plan.slides.slice(1).map((slide) => slide.headline),
    ['Executive Summary', 'Signals', 'Actions']
  );
});

test('buildDeckPlan summarizes markdown table sections with readable headlines', () => {
  const plan = buildDeckPlan({
    title: 'Table report',
    audience: 'leadership',
    profile: 'briefing',
    sourceText: [
      '| Symbol | Name | Score |',
      '|---|---|---:|',
      '| `000988.SZ` | Sample | 75.05 |'
    ].join('\n')
  });

  assert.equal(plan.slides[1].headline, 'Table: Symbol / Name / Score');
  assert.doesNotMatch(plan.slides[1].headline, /\|/);
});

test('buildDeckPlan maps leading blockquote sections to quote layout', () => {
  const plan = buildDeckPlan({
    title: 'Quote report',
    audience: 'leadership',
    profile: 'briefing',
    sourceText: [
      '> Markets reprice before filings.',
      '> Evidence stays local.'
    ].join('\n')
  });

  assert.equal(plan.slides[1].layout_intent, 'quote');
  assert.equal(plan.slides[1].headline, 'Quote: Markets reprice before filings.');
  assert.equal(plan.slides[1].body, '> Markets reprice before filings.\n> Evidence stays local.');
});

test('buildDeckPlan rejects invalid inputs with clear errors', () => {
  for (const [name, input, message] of invalidPlannerInputs) {
    assert.throws(() => buildDeckPlan(input), message, name);
  }
});
