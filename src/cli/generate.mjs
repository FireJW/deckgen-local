import { randomUUID as defaultRandomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateDeckContract } from '../contract/validate.mjs';
import { buildQcReport } from '../qc/report.mjs';
import { renderHtmlDeck } from '../renderers/html-guizang/render.mjs';

export class DeckgenUserError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DeckgenUserError';
  }
}

export const normalizeOutputs = (output) => output === 'both' ? ['html', 'pptx'] : [output];

export const failIfPptxRequested = (outputs) => {
  if (outputs.includes('pptx')) {
    throw new DeckgenUserError('PPTX output is not implemented in Phase 1; requires ppt-master wrapper.');
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
  sourcePath
}) => {
  const validation = validateDeckContract(contract);
  if (!validation.ok) {
    throw new DeckgenUserError(`Deck contract validation failed: ${validation.error}`);
  }

  failIfPptxRequested(contract.outputs);

  const { runDir } = createRunDirectory(workdir);

  writeJson(path.join(runDir, 'request.json'), request);
  writeJson(path.join(runDir, 'source_manifest.json'), sourceManifest);
  writeFileSync(path.join(runDir, 'content.md'), content, 'utf8');
  writeJson(path.join(runDir, 'deck_contract.json'), contract);

  let htmlPath = '';
  if (contract.outputs.includes('html')) {
    const htmlDir = path.join(runDir, 'html');
    mkdirSync(htmlDir);
    htmlPath = path.join(htmlDir, 'index.html');
    writeFileSync(htmlPath, renderHtmlDeck(contract), 'utf8');
  }

  writeFileSync(path.join(runDir, 'qc_report.md'), buildQcReport({
    sourcePath,
    validation,
    htmlPath
  }), 'utf8');

  return { runDir, validation, htmlPath };
};
