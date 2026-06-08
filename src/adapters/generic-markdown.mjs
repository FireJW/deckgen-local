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

const normalizeMarkdown = (markdown) => markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const parseFrontmatterScalar = (line) => {
  const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
  if (!match) {
    return null;
  }

  return [match[1], match[2].replace(/^['"]|['"]$/g, '')];
};

const parseSupportedFrontmatter = (raw) => {
  const metadata = {};
  const lines = raw.split('\n');
  let inThemeBlock = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalar = parseFrontmatterScalar(line);
    if (scalar?.[0] === 'title' && scalar[1]) {
      metadata.title = scalar[1];
      continue;
    }

    if (line.trim() === 'theme:') {
      inThemeBlock = true;
      metadata.theme ??= {};
      continue;
    }

    if (inThemeBlock) {
      const nested = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
      if (nested) {
        const key = nested[1];
        const value = nested[2].replace(/^['"]|['"]$/g, '');
        if (key === 'renderer_hint' && value) {
          metadata.theme.renderer_hint = value;
        }
        if (key === 'tone' && value) {
          metadata.theme.tone = value;
        }
        continue;
      }

      if (line.trim() !== '' && !line.startsWith('  ')) {
        inThemeBlock = false;
      }
    }
  }

  return metadata;
};

const extractLeadingFrontmatter = (markdown) => {
  const normalized = normalizeMarkdown(markdown);
  const match = normalized.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) {
    return { metadata: {}, markdown };
  }

  return {
    metadata: parseSupportedFrontmatter(match[1].trim()),
    markdown: normalized.slice(match[0].length).replace(/^\n/, '')
  };
};

const attachPrimarySourceEvidence = (slides) => slides.map((slide, index) => {
  if (index === 0) {
    return slide;
  }

  const sourceEvidence = { id: `${slide.id}-source`, source_ref: 'primary' };
  return {
    ...slide,
    evidence_refs: [sourceEvidence],
    items: Array.isArray(slide.items)
      ? slide.items.map((item, itemIndex) => ({
        ...item,
        evidence_refs: [{ id: `${slide.id}-item-${itemIndex + 1}-source`, source_ref: 'primary' }]
      }))
      : slide.items
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

  const parsed = extractLeadingFrontmatter(markdown);
  const bodyMarkdown = parsed.markdown;
  const title = parsed.metadata.title
    ?? firstMarkdownHeading(bodyMarkdown)
    ?? fallbackTitleFromPath(sourcePath);
  const rendererHint = parsed.metadata.theme?.renderer_hint
    ?? (profile === 'learning' ? 'ink_classic' : 'indigo_porcelain');
  const contract = buildDeckPlan({
    title,
    audience: 'internal briefing',
    profile,
    sourceText: bodyMarkdown
  });
  const parsedTheme = parsed.metadata.theme ?? {};

  return {
    content: bodyMarkdown,
    contract: {
      ...contract,
      source_refs: [{ type: 'local_file', path: sourcePath, role: 'primary', id: 'primary' }],
      hard_constraints: ['Keep the source text grounded', 'Do not invent facts'],
      theme: {
        ...contract.theme,
        renderer_hint: rendererHint,
        ...(parsedTheme.tone ? { tone: parsedTheme.tone } : {})
      },
      slides: attachPrimarySourceEvidence(contract.slides),
      outputs: ['html']
    }
  };
}
