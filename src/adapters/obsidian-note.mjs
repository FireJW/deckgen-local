import { buildGenericMarkdownPackage } from './generic-markdown.mjs';

const applyTitleOverride = (deckPackage, title) => {
  if (title === undefined) {
    return deckPackage;
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new TypeError('title must be a non-empty string');
  }

  const normalizedTitle = title.trim();
  return {
    ...deckPackage,
    contract: {
      ...deckPackage.contract,
      title: normalizedTitle,
      slides: deckPackage.contract.slides.map((slide, index) =>
        index === 0 ? { ...slide, headline: normalizedTitle } : slide
      )
    }
  };
};

export function buildObsidianNoteDeck(input = {}) {
  const { title, sourcePath, markdown } = input;

  return applyTitleOverride(
    buildGenericMarkdownPackage({ sourcePath, markdown, profile: 'learning' }),
    title
  );
}
