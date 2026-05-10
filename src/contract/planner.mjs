import { allowedProfiles, deckContractSchemaVersion } from './schema.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const splitSourceText = (sourceText) =>
  sourceText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 6);

const summarizeHeadline = (section, index) => {
  const firstLine = section.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const normalized = firstLine.replace(/^#+\s*/, '').trim();
  return normalized || `Key point ${index + 1}`;
};

export function buildDeckPlan(input) {
  if (!isObject(input)) {
    throw new TypeError('buildDeckPlan options object is required');
  }

  const { title, audience, profile, sourceText } = input;

  if (!isNonEmptyString(title)) {
    throw new TypeError('title must be a non-empty string');
  }

  if (!isNonEmptyString(audience)) {
    throw new TypeError('audience must be a non-empty string');
  }

  if (!allowedProfiles.includes(profile)) {
    throw new TypeError('profile must be one of briefing, learning, article');
  }

  if (typeof sourceText !== 'string') {
    throw new TypeError('sourceText must be a string');
  }

  const normalizedTitle = title.trim();
  const normalizedAudience = audience.trim();
  const contentLayout = profile === 'learning' ? 'text_split' : 'evidence';
  const contentSlides = splitSourceText(sourceText).map((section, index) => ({
    id: `s${String(index + 2).padStart(2, '0')}`,
    role: 'content',
    headline: summarizeHeadline(section, index),
    body: section,
    evidence_refs: [],
    layout_intent: contentLayout
  }));

  const slides = [
    {
      id: 's01',
      role: 'cover',
      headline: normalizedTitle,
      body: normalizedAudience,
      evidence_refs: [],
      layout_intent: 'hero_dark'
    },
    ...contentSlides
  ];

  return {
    schema_version: deckContractSchemaVersion,
    title: normalizedTitle,
    audience: normalizedAudience,
    profile,
    duration_minutes: Math.max(1, slides.length * 2),
    target_slide_count: slides.length,
    language: 'zh-CN',
    source_refs: [],
    hard_constraints: [],
    theme: { renderer_hint: 'indigo_porcelain', tone: 'research / AI / technology' },
    slides,
    outputs: ['html']
  };
}
