import path from 'node:path';
import { buildDeckPlan } from '../contract/planner.mjs';

const firstMarkdownHeading = (markdown) => {
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match?.[1]?.trim();
};

const fallbackTitleFromPath = (sourcePath) => {
  const basename = path.basename(sourcePath ?? 'Untitled deck', path.extname(sourcePath ?? ''));
  return basename.trim() || 'Untitled deck';
};

const attachPrimarySourceEvidence = (slides) => slides.map((slide, index) => {
  if (index === 0) {
    return slide;
  }

  return {
    ...slide,
    evidence_refs: [{ id: `${slide.id}-source`, source_ref: 'primary' }]
  };
});

export function buildGenericMarkdownPackage(input) {
  const {
    sourcePath,
    markdown,
    profile = 'briefing'
  } = input ?? {};

  if (typeof markdown !== 'string') {
    throw new TypeError('markdown must be a string');
  }

  const title = firstMarkdownHeading(markdown) ?? fallbackTitleFromPath(sourcePath);
  const contract = buildDeckPlan({
    title,
    audience: 'internal briefing',
    profile,
    sourceText: markdown
  });

  return {
    content: markdown,
    contract: {
      ...contract,
      source_refs: [{ type: 'local_file', path: sourcePath, role: 'primary', id: 'primary' }],
      hard_constraints: ['Keep the source text grounded', 'Do not invent facts'],
      theme: {
        ...contract.theme,
        renderer_hint: profile === 'learning' ? 'ink_classic' : 'indigo_porcelain'
      },
      slides: attachPrimarySourceEvidence(contract.slides),
      outputs: ['html']
    }
  };
}
