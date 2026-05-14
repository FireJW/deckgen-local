import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteSlideImageItems } from '../contract/slide-content.mjs';

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

const readUInt24LE = (buffer, offset) =>
  buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);

const dimensionsFromPng = (buffer) => {
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer.toString('ascii', 1, 4) !== 'PNG' ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const dimensionsFromGif = (buffer) => {
  if (buffer.length < 10 || !/^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))) {
    return null;
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8)
  };
};

const isJpegStartOfFrame = (marker) =>
  (marker >= 0xc0 && marker <= 0xc3) ||
  (marker >= 0xc5 && marker <= 0xc7) ||
  (marker >= 0xc9 && marker <= 0xcb) ||
  (marker >= 0xcd && marker <= 0xcf);

const dimensionsFromJpeg = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) {
      offset += 1;
    }
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) {
      break;
    }

    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }
    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    if (isJpegStartOfFrame(marker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5)
      };
    }

    offset += segmentLength;
  }

  return null;
};

const dimensionsFromWebp = (buffer) => {
  if (
    buffer.length < 30 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    return null;
  }

  const chunkType = buffer.toString('ascii', 12, 16);
  if (chunkType === 'VP8X' && buffer.length >= 30) {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1
    };
  }

  if (chunkType === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    return {
      width: (((buffer[22] & 0x3f) << 8) | buffer[21]) + 1,
      height: (((buffer[24] & 0x0f) << 10) | (buffer[23] << 2) | ((buffer[22] & 0xc0) >> 6)) + 1
    };
  }

  return null;
};

const imageOrientation = (aspectRatio) => {
  if (aspectRatio >= 1.2) {
    return 'landscape';
  }
  if (aspectRatio <= 0.8) {
    return 'portrait';
  }
  return 'square';
};

const readImageDimensions = (filePath) => {
  const buffer = readFileSync(filePath);
  const dimensions =
    dimensionsFromPng(buffer) ||
    dimensionsFromJpeg(buffer) ||
    dimensionsFromGif(buffer) ||
    dimensionsFromWebp(buffer);

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return {};
  }

  const aspectRatio = Number((dimensions.width / dimensions.height).toFixed(4));
  return {
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio,
    orientation: imageOrientation(aspectRatio)
  };
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
      relativePath,
      ...readImageDimensions(resolvedSourcePath)
    };
    copiedBySource.set(sourceKey, copied);
    assets.push(copied);
    return copied;
  };

  let changed = false;
  const slides = contract.slides.map((slide) => {
    const body = rewriteBodyImages({ body: slide?.body, copyImage });
    const itemRewrite = rewriteSlideImageItems({
      items: slide?.items,
      copyImage,
      shouldCopyImage: isCopyableLocalImageSource
    });

    if (body === slide?.body && !itemRewrite.changed) {
      return slide;
    }

    changed = true;
    const rewrittenSlide = { ...slide, body };
    if (slide && Object.hasOwn(slide, 'items')) {
      rewrittenSlide.items = itemRewrite.items;
    }
    return rewrittenSlide;
  });

  return {
    contract: changed ? { ...contract, slides } : contract,
    assets
  };
}
