import { randomUUID as defaultRandomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateDeckContract } from '../contract/validate.mjs';
import { buildQcReport } from '../qc/report.mjs';
import { getHtmlGuizangAssetFiles, renderHtmlDeck } from '../renderers/html-guizang/render.mjs';
import { getPptMasterExporterPath, renderPptMasterDeck } from '../renderers/ppt-master/render.mjs';

export class DeckgenUserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeckgenUserError';
  }
}

export const normalizeOutputs = (output) => output === 'both' ? ['html', 'pptx'] : [output];

export const failIfPptxRequested = (outputs, config = {}) => {
  if (outputs.includes('pptx')) {
    if (typeof config.pptMasterPath !== 'string' || config.pptMasterPath.trim() === '') {
      throw new DeckgenUserError('pptMasterPath is required for PPTX output. Set --ppt-master-path or DECKGEN_PPT_MASTER_PATH.');
    }

    const exporterPath = getPptMasterExporterPath(path.resolve(config.pptMasterPath));
    if (!existsSync(exporterPath)) {
      throw new DeckgenUserError(`ppt-master exporter not found: ${exporterPath}`);
    }
  }
};

const timestampRunIdPart = (date) => date.toISOString().replace(/[:.]/g, '-');

export const createRunDirectory = (workdir, options = {}) => {
  const {
    now = () => new Date(),
    randomUUID = defaultRandomUUID,
    maxAttempts = 5
  } = options;
  const runRoot = path.resolve(workdir, '.tmp', 'deckgen');

  mkdirSync(runRoot, { recursive: true });

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const runId = `${timestampRunIdPart(now())}-${randomUUID()}`;
    const runDir = path.join(runRoot, runId);

    try {
      mkdirSync(runDir);
      return { runDir, runId };
    } catch (error) {
      if (error?.code === 'EEXIST') {
        continue;
      }

      throw error;
    }
  }

  throw new DeckgenUserError(`Could not create a unique deckgen run directory after ${maxAttempts} attempts.`);
};

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export const writeGenerateBundle = ({
  workdir,
  request,
  sourceManifest,
  content,
  contract,
  sourcePath,
  config = {}
}) => {
  const validation = validateDeckContract(contract);
  if (!validation.ok) {
    throw new DeckgenUserError(`Deck contract validation failed: ${validation.error}`);
  }

  failIfPptxRequested(contract.outputs, config);

  const { runDir } = createRunDirectory(workdir);

  writeJson(path.join(runDir, 'request.json'), request);
  writeJson(path.join(runDir, 'source_manifest.json'), sourceManifest);
  writeFileSync(path.join(runDir, 'content.md'), content, 'utf8');
  writeJson(path.join(runDir, 'deck_contract.json'), contract);

  let htmlPath = '';
  let pptxPaths = [];
  let pptxQa = [];
  if (contract.outputs.includes('html')) {
    const htmlDir = path.join(runDir, 'html');
    mkdirSync(htmlDir);
    htmlPath = path.join(htmlDir, 'index.html');
    writeFileSync(htmlPath, renderHtmlDeck(contract), 'utf8');
    for (const asset of getHtmlGuizangAssetFiles()) {
      const assetPath = path.join(htmlDir, asset.relativePath);
      mkdirSync(path.dirname(assetPath), { recursive: true });
      copyFileSync(asset.sourcePath, assetPath);
    }
  }

  if (contract.outputs.includes('pptx')) {
    try {
      const pptxResult = renderPptMasterDeck({
        contract,
        content,
        config,
        outputDir: path.join(runDir, 'ppt-master')
      });
      pptxPaths = pptxResult.pptxPaths;
      pptxQa = pptxResult.pptxQa;
    } catch (error) {
      throw new DeckgenUserError(error.message);
    }
  }

  writeFileSync(path.join(runDir, 'qc_report.md'), buildQcReport({
    sourcePath,
    validation,
    htmlPath,
    pptxPaths,
    pptxQa
  }), 'utf8');

  return { runDir, validation, htmlPath, pptxPaths, pptxQa };
};
