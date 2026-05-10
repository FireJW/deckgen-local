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
const readingLabPackageName = 'agent-reading-lab.json';
const readingLabIndexName = 'index.md';
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

const readJson = (filePath, label = path.basename(filePath)) => {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new DeckgenUserError(`Could not read ${label}: ${error.message}`);
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
    return loadImplicitSourceDirectory({ source, explicitProfile, manifestPath });
  }

  const manifest = readJson(manifestPath, sourceManifestName);
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

const loadImplicitSourceDirectory = ({ source, explicitProfile, manifestPath }) => {
  const packagePath = path.join(source, publishPackageName);
  if (existsSync(packagePath)) {
    return loadPublishPackageDirectory({ source, explicitProfile, packagePath });
  }

  const readingLabPath = path.join(source, readingLabPackageName);
  if (existsSync(readingLabPath)) {
    return loadReadingLabDirectory({ source, explicitProfile, readingLabPath });
  }

  throw new DeckgenUserError(`Directory sources must include ${sourceManifestName}, ${publishPackageName}, or ${readingLabPackageName}: ${manifestPath}`);
};

const loadPublishPackageDirectory = ({ source, explicitProfile, packagePath }) => {
  const publishPackage = readJson(packagePath, publishPackageName);
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

const readingLabTitle = (readingLabPackage) => {
  const source = isObject(readingLabPackage.source) ? readingLabPackage.source : {};
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const chapter = typeof source.chapter === 'string' ? source.chapter.trim() : '';

  if (title && chapter) {
    return `${title} - ${chapter}`;
  }
  return title || chapter || undefined;
};

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const loadReadingLabDirectory = ({ source, explicitProfile, readingLabPath }) => {
  const readingLabPackage = readJson(readingLabPath, readingLabPackageName);
  if (readingLabPackage.schema !== 'agent_reading_lab/v1') {
    throw new DeckgenUserError(`${readingLabPackageName}.schema must be agent_reading_lab/v1`);
  }

  const indexPath = path.join(source, readingLabIndexName);
  let indexStat;
  try {
    indexStat = statSync(indexPath);
  } catch {
    throw new DeckgenUserError(`Obsidian reading-lab package must include ${readingLabIndexName}: ${indexPath}`);
  }

  if (!indexStat.isFile()) {
    throw new DeckgenUserError(`Obsidian reading-lab index is not a file: ${indexPath}`);
  }

  const sourceType = 'obsidian-reading-lab';
  const profile = 'learning';
  assertProfileCompatible({ explicitProfile, profile, sourceType });

  const markdown = readFileSync(indexPath, 'utf8');
  const deckPackage = buildObsidianNoteDeck({
    title: readingLabTitle(readingLabPackage),
    sourcePath: indexPath,
    markdown
  });

  return {
    ...deckPackage,
    sourceType,
    sourcePath: indexPath,
    profile,
    sourceManifest: {
      type: sourceType,
      schema: readingLabPackage.schema,
      root: source,
      manifest: fileManifestEntry(readingLabPath),
      primary: fileManifestEntry(indexPath)
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
