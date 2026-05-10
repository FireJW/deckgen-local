#!/usr/bin/env node
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildBrowserLaunchOptions,
  findHtmlArtifactForRunDir,
  parseViewportOption,
  validateVisualSmokeResult
} from '../src/qc/html-visual-smoke.mjs';

const usage = [
  'html-visual-smoke --html <path> | --run-dir <dir> [--expected-title <title>] [--expected-slides <n>]',
  '                  [--screenshot-out <path>] [--module-dir <node_modules>]',
  '                  [--browser-executable <path>] [--viewport <width>x<height>]'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = (tokens) => {
  const options = {};
  const flagMap = new Map([
    ['--html', 'htmlPath'],
    ['--run-dir', 'runDir'],
    ['--expected-title', 'expectedTitle'],
    ['--expected-slides', 'expectedSlides'],
    ['--screenshot-out', 'screenshotOut'],
    ['--module-dir', 'moduleDir'],
    ['--browser-executable', 'browserExecutable'],
    ['--viewport', 'viewport']
  ]);

  for (let index = 0; index < tokens.length; index += 2) {
    const flag = tokens[index];
    const value = tokens[index + 1];

    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    if (!flag?.startsWith('--')) {
      fail(`Unexpected argument: ${flag ?? ''}`);
    }

    if (value === undefined || value.startsWith('--')) {
      fail(`Missing value for ${flag}.`);
    }

    const key = flagMap.get(flag);
    if (!key) {
      fail(`Unsupported option: ${flag}`);
    }

    options[key] = value;
  }

  const targetCount = [options.htmlPath, options.runDir]
    .filter((value) => value !== undefined).length;
  if (targetCount === 0) {
    fail('Missing required option: --html or --run-dir.');
  }

  if (targetCount > 1) {
    fail('Pass only one of --html or --run-dir.');
  }

  if (options.expectedSlides !== undefined) {
    const expectedSlides = Number(options.expectedSlides);
    if (!Number.isInteger(expectedSlides) || expectedSlides < 1) {
      fail('--expected-slides must be a positive integer.');
    }
    options.expectedSlides = expectedSlides;
  }

  try {
    options.viewport = parseViewportOption(options.viewport);
  } catch (error) {
    fail(error.message);
  }

  return options;
};

const resolvePlaywright = (moduleDir) => {
  const explicitModuleDir = moduleDir || process.env.DECKGEN_PLAYWRIGHT_MODULE_DIR;
  const resolver = explicitModuleDir
    ? createRequire(path.join(path.resolve(explicitModuleDir), 'deckgen-playwright-resolver.cjs'))
    : createRequire(import.meta.url);

  try {
    return resolver('playwright');
  } catch (error) {
    throw new Error(`Playwright is required for visual smoke. Install it or pass --module-dir / set DECKGEN_PLAYWRIGHT_MODULE_DIR. ${error.message}`);
  }
};

const defaultScreenshotPath = (htmlPath) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `${path.basename(path.dirname(path.dirname(htmlPath))) || 'deck'}-${stamp}.png`;
  return path.resolve(process.cwd(), '.tmp', 'deckgen-visual-smoke', name);
};

const summarizePage = async (page, htmlPath, screenshotPath) => {
  const htmlSource = readFileSync(htmlPath, 'utf8');
  const motionAssetPath = path.join(path.dirname(htmlPath), 'assets', 'motion.min.js');
  const motionAssetBytes = existsSync(motionAssetPath) && statSync(motionAssetPath).isFile()
    ? statSync(motionAssetPath).size
    : 0;
  const summary = await page.evaluate(() => {
    const textElements = Array.from(document.querySelectorAll('.slide h1, .slide h2, .slide p, .slide-kicker, .chrome, .foot, #nav'));
    const appearsOverflowing = (element) => {
      const rect = element.getBoundingClientRect();
      const container = element.closest('.slide');
      const bounds = container
        ? container.getBoundingClientRect()
        : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      const tolerance = 8;
      const horizontalScrollOverflow = element.scrollWidth > element.clientWidth + tolerance;
      const boxOverflow = rect.left < bounds.left - tolerance
        || rect.right > bounds.right + tolerance
        || rect.top < bounds.top - tolerance
        || rect.bottom > bounds.bottom + tolerance;

      return horizontalScrollOverflow || boxOverflow;
    };
    const overflowItems = textElements
      .filter(appearsOverflowing)
      .slice(0, 10)
      .map((element) => ({
        selector: `${element.tagName.toLowerCase()}${Array.from(element.classList).map((part) => `.${part}`).join('')}`,
        text: element.textContent.trim().slice(0, 120),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight
      }));

    return {
      title: document.title,
      renderer: document.querySelector('[data-renderer]')?.getAttribute('data-renderer') ?? '',
      deckElementPresent: Boolean(document.querySelector('#deck[data-renderer="html-guizang"]')),
      navElementPresent: Boolean(document.querySelector('#nav')),
      backgroundCanvasCount: document.querySelectorAll('canvas.bg').length,
      externalScriptSrcs: Array.from(document.scripts)
        .map((script) => script.src)
        .filter(Boolean),
      slideCount: document.querySelectorAll('.slide').length,
      textLength: document.body.innerText.trim().length,
      overflowItems
    };
  });

  await page.screenshot({ path: screenshotPath, fullPage: true });
  const screenshotBytes = statSync(screenshotPath).size;

  return {
    ...summary,
    localMotionImportPresent: htmlSource.includes("import('./assets/motion.min.js')"),
    localMotionAssetBytes: motionAssetBytes,
    screenshotPath,
    screenshotBytes
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  let htmlPath;
  if (options.htmlPath) {
    htmlPath = path.resolve(options.htmlPath);
    if (!existsSync(htmlPath)) {
      fail(`HTML file not found: ${htmlPath}`);
    }
  } else {
    try {
      htmlPath = findHtmlArtifactForRunDir(path.resolve(options.runDir));
    } catch (error) {
      fail(error.message);
    }
  }

  const screenshotPath = path.resolve(options.screenshotOut ?? defaultScreenshotPath(htmlPath));
  mkdirSync(path.dirname(screenshotPath), { recursive: true });

  const { chromium } = resolvePlaywright(options.moduleDir);
  const browser = await chromium.launch(buildBrowserLaunchOptions({
    browserExecutable: options.browserExecutable
  }));

  try {
    const page = await browser.newPage({ viewport: options.viewport });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    const summary = await summarizePage(page, htmlPath, screenshotPath);
    const validation = validateVisualSmokeResult(summary, {
      expectedTitle: options.expectedTitle,
      expectedSlides: options.expectedSlides
    });

    process.stdout.write(`${JSON.stringify({ ...summary, ...validation }, null, 2)}\n`);
    if (!validation.ok) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
