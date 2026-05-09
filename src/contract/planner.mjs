import { deckContractSchemaVersion } from './schema.mjs';

const splitSourceText = (sourceText = '') =>
  String(sourceText)
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 6);

const summarizeHeadline = (section, index) => {
  const firstLine = section.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const normalized = firstLine.replace(/^#+\s*/, '').trim();
  return normalized || `Key point ${index + 1}`;
};

export function buildDeckPlan({ title, audience, profile, sourceText }) {
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
      headline: title,
      body: audience,
      evidence_refs: [],
      layout_intent: 'hero_dark'
    },
    ...contentSlides
  ];

  return {
    schema_version: deckContractSchemaVersion,
    title,
    audience,
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
