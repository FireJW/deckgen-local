export function validateVisualSmokeResult(summary = {}, options = {}) {
  const errors = [];
  const title = String(summary.title ?? '').trim();
  const renderer = String(summary.renderer ?? '').trim();
  const slideCount = Number(summary.slideCount ?? 0);
  const textLength = Number(summary.textLength ?? 0);
  const overflowItems = Array.isArray(summary.overflowItems) ? summary.overflowItems : [];
  const screenshotPath = String(summary.screenshotPath ?? '').trim();
  const screenshotBytes = Number(summary.screenshotBytes ?? 0);

  if (!title) {
    errors.push('title is empty');
  }

  if (options.expectedTitle && title && title !== options.expectedTitle) {
    errors.push(`title "${title}" does not match expected "${options.expectedTitle}"`);
  }

  if (renderer !== 'html-guizang') {
    errors.push(`renderer "${renderer}" is not html-guizang`);
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
