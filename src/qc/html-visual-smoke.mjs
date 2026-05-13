import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export function validateVisualSmokeResult(summary = {}, options = {}) {
  const errors = [];
  const title = String(summary.title ?? '').trim();
  const renderer = String(summary.renderer ?? '').trim();
  const isSwiss = renderer === 'html-guizang-swiss';
  const slideCount = Number(summary.slideCount ?? 0);
  const textLength = Number(summary.textLength ?? 0);
  const overflowItems = Array.isArray(summary.overflowItems) ? summary.overflowItems : [];
  const brokenImageItems = Array.isArray(summary.brokenImageItems) ? summary.brokenImageItems : [];
  const deckElementPresent = summary.deckElementPresent === true;
  const navElementPresent = summary.navElementPresent === true;
  const backgroundCanvasCount = Number(summary.backgroundCanvasCount ?? 0);
  const localMotionImportPresent = summary.localMotionImportPresent === true;
  const localMotionAssetBytes = Number(summary.localMotionAssetBytes ?? 0);
  const externalScriptSrcs = Array.isArray(summary.externalScriptSrcs) ? summary.externalScriptSrcs : [];
  const hasSwissLayouts = summary.hasSwissLayouts === true;
  const screenshotPath = String(summary.screenshotPath ?? '').trim();
  const screenshotBytes = Number(summary.screenshotBytes ?? 0);

  if (!title) {
    errors.push('title is empty');
  }

  if (options.expectedTitle && title && title !== options.expectedTitle) {
    errors.push(`title "${title}" does not match expected "${options.expectedTitle}"`);
  }

  if (!['html-guizang', 'html-guizang-swiss'].includes(renderer)) {
    errors.push(`unexpected renderer marker: ${renderer || 'missing'}`);
  }

  if (!deckElementPresent) {
    errors.push('guizang deck element is missing');
  }

  if (isSwiss && !hasSwissLayouts) {
    errors.push('Swiss renderer is missing registered data-layout markers');
  }

  if (!navElementPresent) {
    errors.push('guizang navigation element is missing');
  }

  const minimumBackgroundCanvasCount = isSwiss ? 0 : 2;
  if (!Number.isFinite(backgroundCanvasCount) || backgroundCanvasCount < minimumBackgroundCanvasCount) {
    errors.push(`background canvas count ${backgroundCanvasCount} is below ${minimumBackgroundCanvasCount}`);
  }

  if (!localMotionImportPresent) {
    errors.push('local motion import is missing');
  }

  if (!Number.isFinite(localMotionAssetBytes) || localMotionAssetBytes < 1) {
    errors.push('local motion asset is missing');
  }

  if (externalScriptSrcs.length > 0) {
    errors.push(`external script src is not allowed: ${externalScriptSrcs.join(', ')}`);
  }

  if (Number.isInteger(options.expectedSlides) && slideCount !== options.expectedSlides) {
    errors.push(`slide count ${slideCount} does not match expected ${options.expectedSlides}`);
  } else if (!Number.isFinite(slideCount) || slideCount < 1) {
    errors.push(`slide count ${slideCount} is not positive`);
  }

  if (!Number.isFinite(textLength) || textLength < 1) {
    errors.push('page text is empty');
  }

  if (overflowItems.length > 0) {
    const label = overflowItems.length === 1 ? 'text element' : 'text elements';
    const verb = overflowItems.length === 1 ? 'appears' : 'appear';
    errors.push(`${overflowItems.length} ${label} ${verb} to overflow`);
  }

  if (brokenImageItems.length > 0) {
    const label = brokenImageItems.length === 1 ? 'image appears' : 'images appear';
    const sources = brokenImageItems
      .slice(0, 5)
      .map((item) => String(item?.src ?? '').trim())
      .filter(Boolean)
      .join(', ');
    errors.push(`${brokenImageItems.length} ${label} broken${sources ? `: ${sources}` : ''}`);
  }

  if (!screenshotPath || !Number.isFinite(screenshotBytes) || screenshotBytes < 1) {
    errors.push('screenshot is missing');
  }

  return { ok: errors.length === 0, errors };
}

export function buildBrowserLaunchOptions(options = {}) {
  const launchOptions = { headless: true };
  const browserExecutable = String(options.browserExecutable ?? '').trim();

  if (browserExecutable) {
    launchOptions.executablePath = browserExecutable;
  }

  return launchOptions;
}

export function parseViewportOption(value) {
  if (value === undefined || value === null) {
    return { width: 1440, height: 900 };
  }

  const input = String(value).trim();
  const match = input.match(/^(\d+)[xX](\d+)$/);

  if (!match) {
    throw new Error('--viewport must use WIDTHxHEIGHT, for example 1440x900 or 390x844.');
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('--viewport width and height must be positive integers.');
  }

  return { width, height };
}

export function findHtmlArtifactForRunDir(runDir) {
  const resolvedRunDir = path.resolve(runDir ?? '');
  if (!existsSync(resolvedRunDir)) {
    throw new Error(`Deckgen run directory not found: ${resolvedRunDir}`);
  }

  const runStats = statSync(resolvedRunDir);
  if (!runStats.isDirectory()) {
    throw new Error(`Deckgen run path is not a directory: ${resolvedRunDir}`);
  }

  const htmlPath = path.join(resolvedRunDir, 'html', 'index.html');
  if (!existsSync(htmlPath)) {
    throw new Error(`HTML artifact not found under deckgen run directory: ${htmlPath}`);
  }

  const htmlStats = statSync(htmlPath);
  if (!htmlStats.isFile()) {
    throw new Error(`HTML artifact path is not a file: ${htmlPath}`);
  }

  return htmlPath;
}

export function inferExpectedVisualSmokeOptionsForRunDir(runDir) {
  const contractPath = path.join(path.resolve(runDir ?? ''), 'deck_contract.json');
  if (!existsSync(contractPath)) {
    return {};
  }

  try {
    const contract = JSON.parse(readFileSync(contractPath, 'utf8'));
    const inferred = {};
    if (typeof contract?.title === 'string' && contract.title.trim()) {
      inferred.expectedTitle = contract.title.trim();
    }
    if (Number.isInteger(contract?.target_slide_count) && contract.target_slide_count > 0) {
      inferred.expectedSlides = contract.target_slide_count;
    } else if (Array.isArray(contract?.slides) && contract.slides.length > 0) {
      inferred.expectedSlides = contract.slides.length;
    }
    return inferred;
  } catch {
    return {};
  }
}
