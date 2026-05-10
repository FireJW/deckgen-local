import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildArticlePackageDeck } from '../adapters/article-package.mjs';
import { buildGenericMarkdownPackage } from '../adapters/generic-markdown.mjs';
import { buildObsidianNoteDeck } from '../adapters/obsidian-note.mjs';
import { buildResearchReportDeck } from '../adapters/research-report.mjs';
import { allowedProfiles } from '../contract/schema.mjs';
import { DeckgenUserError } from './generate.mjs';

const sourceManifestName = 'deckgen.source.json';
const publishPackageName = 'publish-package.json';
const typedProfiles = {
  'article-package': 'article',
  'research-report': 'briefing',
  'obsidian-note': 'learning'
};

const typedBuilders = {
  'article-package': buildArticlePackageDeck,
  'research-report': buildResearchReportDeck,
  'obsidian-note': buildObsidianNoteDeck
};

const readJson = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new DeckgenUserError(`Could not read ${sourceManifestName}: ${error.message}`);
  }
};

const fileManifestEntry = (filePath) => {
  const stat = statSync(filePath);
  return {
    path: filePath,
    bytes: stat.size,
    modified_at: stat.mtime.toISOString()
  };
};

const assertAllowedProfile = (profile) => {
  if (!allowedProfiles.includes(profile)) {
    throw new DeckgenUserError(`Invalid profile: ${profile}. Expected one of ${allowedProfiles.join(', ')}.`);
  }
};

const assertProfileCompatible = ({ explicitProfile, profile, sourceType }) => {
  if (explicitProfile && explicitProfile !== profile) {
    throw new DeckgenUserError(`profile ${explicitProfile} conflicts with ${sourceType} profile ${profile}`);
  }
};

const loadMarkdownFile = ({ source, profile }) => {
  assertAllowedProfile(profile);
  const markdown = readFileSync(source, 'utf8');
  const deckPackage = buildGenericMarkdownPackage({ sourcePath: source, markdown, profile });

  return {
    ...deckPackage,
    sourceType: 'generic-markdown',
    sourcePath: source,
    profile,
    sourceManifest: {
      type: 'generic-markdown',
      primary: fileManifestEntry(source)
    }
  };
};

const loadSourceDirectory = ({ source, explicitProfile }) => {
  const manifestPath = path.join(source, sourceManifestName);
  if (!existsSync(manifestPath)) {
    return loadPublishPackageDirectory({ source, explicitProfile, manifestPath });
  }

  const manifest = readJson(manifestPath);
  const sourceType = manifest.type;
  const profile = typedProfiles[sourceType];
  const builder = typedBuilders[sourceType];
  if (!profile || !builder) {
    throw new DeckgenUserError(`Unsupported source package type: ${sourceType ?? ''}`);
  }

  assertProfileCompatible({ explicitProfile, profile, sourceType });

  if (typeof manifest.primary !== 'string' || manifest.primary.trim().length === 0) {
    throw new DeckgenUserError(`${sourceManifestName}.primary must be a non-empty string`);
  }

  const primaryPath = path.resolve(source, manifest.primary);
  let primaryStat;
  try {
    primaryStat = statSync(primaryPath);
  } catch {
    throw new DeckgenUserError(`Primary source file not found: ${primaryPath}`);
  }

  if (!primaryStat.isFile()) {
    throw new DeckgenUserError(`Primary source is not a file: ${primaryPath}`);
  }

  const markdown = readFileSync(primaryPath, 'utf8');
  const deckPackage = builder({
    title: typeof manifest.title === 'string' ? manifest.title : undefined,
    sourcePath: primaryPath,
    markdown
  });

  return {
    ...deckPackage,
    sourceType,
    sourcePath: primaryPath,
    profile,
    sourceManifest: {
      type: sourceType,
      root: source,
      manifest: fileManifestEntry(manifestPath),
      primary: fileManifestEntry(primaryPath)
    }
  };
};

const loadPublishPackageDirectory = ({ source, explicitProfile, manifestPath }) => {
  const packagePath = path.join(source, publishPackageName);
  if (!existsSync(packagePath)) {
    throw new DeckgenUserError(`Directory sources must include ${sourceManifestName} or ${publishPackageName}: ${manifestPath}`);
  }

  const publishPackage = readJson(packagePath);
  if (publishPackage.contract_version !== 'publish-package/v1') {
    throw new DeckgenUserError(`${publishPackageName}.contract_version must be publish-package/v1`);
  }

  if (typeof publishPackage.content_markdown !== 'string' || publishPackage.content_markdown.trim().length === 0) {
    throw new DeckgenUserError(`${publishPackageName}.content_markdown must be a non-empty string`);
  }

  const sourceType = 'publish-package';
  const profile = 'article';
  assertProfileCompatible({ explicitProfile, profile, sourceType });

  const deckPackage = buildArticlePackageDeck({
    title: typeof publishPackage.title === 'string' ? publishPackage.title : undefined,
    sourcePath: packagePath,
    markdown: publishPackage.content_markdown
  });

  return {
    ...deckPackage,
    sourceType,
    sourcePath: packagePath,
    profile,
    sourceManifest: {
      type: sourceType,
      contract_version: publishPackage.contract_version,
      root: source,
      primary: fileManifestEntry(packagePath)
    }
  };
};

export function loadSourcePackage(options = {}) {
  const source = path.resolve(options.source ?? '');
  const explicitProfile = options.profile;
  const profile = explicitProfile ?? 'briefing';

  let sourceStat;
  try {
    sourceStat = statSync(source);
  } catch {
    throw new DeckgenUserError(`Source file not found: ${options.source}`);
  }

  if (sourceStat.isFile()) {
    return loadMarkdownFile({ source, profile });
  }

  if (sourceStat.isDirectory()) {
    return loadSourceDirectory({ source, explicitProfile });
  }

  throw new DeckgenUserError(`Source is not a file or directory: ${source}`);
}
