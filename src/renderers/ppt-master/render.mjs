export const renderPptMasterDeck = ({ contract, config = {}, outputDir }) => {
  if (typeof config.pptMasterPath !== 'string' || config.pptMasterPath.trim() === '') {
    throw new Error('pptMasterPath is required for PPTX output');
  }

  return {
    projectDir: outputDir,
    exportsDir: `${outputDir}/exports`,
    note: 'ppt-master integration requires a configured local checkout and is not executed in Phase 1'
  };
};
