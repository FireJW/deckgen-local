export const deckContractSchemaVersion = 'deck-contract/v1';
export const allowedOutputs = ['html', 'pptx'];
export const allowedCliOutputModes = [...allowedOutputs, 'both'];
export const allowedProfiles = ['briefing', 'learning', 'article'];
export const allowedImageFitHints = ['contain', 'cover'];
export const requiredContractKeys = [
  'schema_version',
  'title',
  'audience',
  'profile',
  'duration_minutes',
  'target_slide_count',
  'language',
  'source_refs',
  'hard_constraints',
  'theme',
  'slides',
  'outputs'
];
