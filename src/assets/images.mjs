import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const markdownImagePattern = /^!\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const remoteSourcePattern = /^(?:https?:|data:|blob:)/i;
const windowsAbsolutePattern = /^[A-Za-z]:[\\/]/;

const normalizeAssetDir = (relativeDir) =>
  String(relativeDir ?? 'assets/images')
    .split(/[\\/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');

const publicPathJoin = (...parts) =>
  parts
    .flatMap((part) => String(part ?? '').split(/[\\/]+/))
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');

const decodePathComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const stripQueryAndHash = (src) => String(src ?? '').split(/[?#]/, 1)[0];

const slugFileStem = (value) => {
  const slug = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'image';
};

const assetFileName = (sourcePath) => {
  const extension = path.extname(sourcePath).toLowerCase() || '.img';
  const stem = slugFileStem(path.basename(sourcePath, path.extname(sourcePath)));
  const hash = createHash('sha1').update(path.resolve(sourcePath)).digest('hex').slice(0, 8);
  return `${stem}-${hash}${extension}`;
};

export const parseMarkdownImageLine = (line) => {
  const match = String(line ?? '').trim().match(markdownImagePattern);
  if (!match) {
    return null;
  }

  const alt = match[1].trim();
  const src = match[2].trim();
  if (!src) {
    return null;
  }

  return {
    alt,
    src,
    title: match[3]?.trim() ?? ''
  };
};

const formatMarkdownImageLine = (image) => {
  const title = image.title ? ` "${image.title}"` : '';
  return `![${image.alt}](${image.src}${title})`;
};

const isCopyableLocalImageSource = (src) => {
  const value = String(src ?? '').trim();
  return value !== '' && !remoteSourcePattern.test(value);
};

const sourcePathForImage = ({ src, sourceBaseDir }) => {
  const stripped = stripQueryAndHash(src);
  if (stripped.startsWith('file://')) {
    return fileURLToPath(stripped);
  }

  const decoded = decodePathComponent(stripped);
  if (path.isAbsolute(decoded) || windowsAbsolutePattern.test(decoded)) {
    return path.resolve(decoded);
  }

  return path.resolve(sourceBaseDir, decoded);
};

const rewriteBodyImages = ({ body, copyImage }) => {
  if (typeof body !== 'string' || body.length === 0) {
    return body;
  }

  let changed = false;
  const rewritten = body
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => {
      const image = parseMarkdownImageLine(line);
      if (!image || !isCopyableLocalImageSource(image.src)) {
        return line;
      }

      const copied = copyImage(image.src);
      if (!copied) {
        return line;
      }

      changed = true;
      return formatMarkdownImageLine({ ...image, src: copied.relativePath });
    })
    .join('\n');

  return changed ? rewritten : body;
};

export function materializeLocalImageAssets({
  contract,
  sourcePath,
  outputDir,
  assetsRelativeDir = 'assets/images'
}) {
  if (!contract || !Array.isArray(contract.slides) || !sourcePath) {
    return { contract, assets: [] };
  }

  const sourceBaseDir = path.dirname(path.resolve(sourcePath));
  const outputRoot = path.resolve(outputDir);
  const publicAssetDir = normalizeAssetDir(assetsRelativeDir);
  const copiedBySource = new Map();
  const assets = [];

  const copyImage = (src) => {
    const resolvedSourcePath = sourcePathForImage({ src, sourceBaseDir });
    if (!existsSync(resolvedSourcePath) || !statSync(resolvedSourcePath).isFile()) {
      throw new Error(`Image asset not found: ${src} (resolved to ${resolvedSourcePath})`);
    }

    const sourceKey = path.resolve(resolvedSourcePath).toLowerCase();
    const existing = copiedBySource.get(sourceKey);
    if (existing) {
      return existing;
    }

    const fileName = assetFileName(resolvedSourcePath);
    const relativePath = publicPathJoin(publicAssetDir, fileName);
    const destinationPath = path.join(outputRoot, ...publicAssetDir.split('/'), fileName);
    mkdirSync(path.dirname(destinationPath), { recursive: true });
    copyFileSync(resolvedSourcePath, destinationPath);

    const copied = {
      sourcePath: resolvedSourcePath,
      destinationPath,
      relativePath
    };
    copiedBySource.set(sourceKey, copied);
    assets.push(copied);
    return copied;
  };

  let changed = false;
  const slides = contract.slides.map((slide) => {
    const body = rewriteBodyImages({ body: slide?.body, copyImage });
    if (body === slide?.body) {
      return slide;
    }

    changed = true;
    return { ...slide, body };
  });

  return {
    contract: changed ? { ...contract, slides } : contract,
    assets
  };
}
