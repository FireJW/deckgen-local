#!/usr/bin/env node
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildBrowserLaunchOptions,
  parseViewportOption
} from '../src/qc/html-visual-smoke.mjs';

const defaultViewports = ['1440x900', '390x844'];
const defaultHtmlPath = 'fixtures/frontend-design-boost/dashboard-demo.html';
const defaultScreenshotDir = '.tmp/frontend-design-boost';
const defaultStateTexts = {
  loading: 'Loading billing feed',
  empty: 'No urgent items',
  error: 'Sync failed'
};

const usage = [
  'frontend-design-boost-fixture-qa [--html <path>] [--viewport <width>x<height> ...]',
  '                                 [--screenshot-dir <dir>] [--module-dir <node_modules>]',
  '                                 [--browser-executable <path>] [--state-config <path>]',
  '                                 [--skip-state-checks]'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const uniqueExistingDirectories = (candidates) => {
  const seen = new Set();
  return candidates
    .map((candidate) => path.resolve(candidate))
    .filter((candidate) => {
      if (seen.has(candidate) || !existsSync(candidate)) {
        return false;
      }
      seen.add(candidate);
      return statSync(candidate).isDirectory();
    });
};

const defaultCodexNodeModuleDirs = () => {
  const homeDir = os.homedir();
  const userProfile = process.env.USERPROFILE;
  const runtimeSuffix = path.join(
    '.cache',
    'codex-runtimes',
    'codex-primary-runtime',
    'dependencies',
    'node',
    'node_modules'
  );

  return uniqueExistingDirectories([
    path.resolve('node_modules'),
    homeDir ? path.join(homeDir, runtimeSuffix) : '',
    userProfile ? path.join(userProfile, runtimeSuffix) : ''
  ].filter(Boolean));
};

const detectBrowserExecutable = (explicitPath) => {
  const candidates = [
    explicitPath,
    process.env.DECKGEN_BROWSER_EXECUTABLE,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
};

const parseArgs = (tokens) => {
  const options = {
    htmlPath: defaultHtmlPath,
    screenshotDir: defaultScreenshotDir,
    viewports: [],
    requireStateChecks: true,
    stateConfigPath: ''
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const flag = tokens[index];

    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    if (flag === '--skip-state-checks') {
      options.requireStateChecks = false;
      continue;
    }

    if (!flag?.startsWith('--')) {
      fail(`Unexpected argument: ${flag ?? ''}`);
    }

    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail(`Missing value for ${flag}.`);
    }

    if (flag === '--html') {
      options.htmlPath = value;
    } else if (flag === '--viewport') {
      options.viewports.push(value);
    } else if (flag === '--screenshot-dir') {
      options.screenshotDir = value;
    } else if (flag === '--module-dir') {
      options.moduleDir = value;
    } else if (flag === '--browser-executable') {
      options.browserExecutable = value;
    } else if (flag === '--state-config') {
      options.stateConfigPath = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  const viewportInputs = options.viewports.length > 0
    ? options.viewports
    : defaultViewports;

  try {
    options.viewports = viewportInputs.map(parseViewportOption);
  } catch (error) {
    fail(error.message);
  }

  return options;
};

const loadStateTexts = ({ htmlPath, explicitStateConfigPath }) => {
  const derivedStateConfigPath = path.resolve(
    path.dirname(htmlPath),
    `${path.basename(htmlPath, path.extname(htmlPath))}.states.json`
  );
  const stateConfigPath = explicitStateConfigPath
    ? path.resolve(explicitStateConfigPath)
    : derivedStateConfigPath;

  if (!existsSync(stateConfigPath)) {
    return { stateConfigPath: '', stateTexts: defaultStateTexts };
  }

  try {
    const parsed = JSON.parse(readFileSync(stateConfigPath, 'utf8'));
    return {
      stateConfigPath,
      stateTexts: {
        loading: parsed.loading ?? defaultStateTexts.loading,
        empty: parsed.empty ?? defaultStateTexts.empty,
        error: parsed.error ?? defaultStateTexts.error
      }
    };
  } catch (error) {
    fail(`Unable to parse state config ${stateConfigPath}: ${error.message}`);
  }
};

const resolvePlaywrightFromModuleDir = (moduleDir) => {
  const resolver = createRequire(path.join(path.resolve(moduleDir), 'deckgen-playwright-resolver.cjs'));
  try {
    return { moduleDir: path.resolve(moduleDir), playwright: resolver('playwright') };
  } catch (error) {
    const pnpmDir = path.join(path.resolve(moduleDir), '.pnpm');
    if (existsSync(pnpmDir)) {
      const candidates = readdirSync(pnpmDir)
        .filter((entry) => entry.startsWith('playwright@'))
        .map((entry) => path.join(pnpmDir, entry, 'node_modules', 'playwright', 'index.js'))
        .filter((entryPath) => existsSync(entryPath));
      for (const candidate of candidates) {
        try {
          const candidateRequire = createRequire(candidate);
          return { moduleDir: path.resolve(moduleDir), playwright: candidateRequire(candidate) };
        } catch {
          continue;
        }
      }
    }

    throw error;
  }
};

const resolvePlaywright = (moduleDir) => {
  const explicitModuleDir = moduleDir || process.env.DECKGEN_PLAYWRIGHT_MODULE_DIR;
  const moduleDirs = explicitModuleDir
    ? uniqueExistingDirectories([explicitModuleDir])
    : defaultCodexNodeModuleDirs();
  const errors = [];

  for (const candidateModuleDir of moduleDirs) {
    try {
      return resolvePlaywrightFromModuleDir(candidateModuleDir);
    } catch (error) {
      errors.push(`${candidateModuleDir}: ${error.message}`);
    }
  }

  try {
    return { moduleDir: '', playwright: createRequire(import.meta.url)('playwright') };
  } catch (error) {
    errors.push(`local script resolver: ${error.message}`);
  }

  throw new Error([
    'Could not resolve Playwright for frontend design boost fixture QA.',
    'Pass --module-dir <node_modules> or set DECKGEN_PLAYWRIGHT_MODULE_DIR.',
    `Checked module dirs: ${moduleDirs.length ? moduleDirs.join(', ') : '(none found)'}.`,
    `Resolver errors: ${errors.join(' | ')}`
  ].join(' '));
};

const viewportLabel = (viewport) => `${viewport.width}x${viewport.height}`;

const screenshotPathForViewport = (screenshotDir, viewport, stem) =>
  path.resolve(screenshotDir, `${stem}-${viewportLabel(viewport)}.png`);

const summarizePage = async ({ page, viewport, screenshotPath, requireStateChecks, stateTexts }) => {
  const summary = await page.evaluate(({ requireStateChecks: shouldCheckStates, stateTexts: expectedStateTexts }) => {
    const pageText = document.body.innerText.trim();
    const elementLabel = (element) => {
      const classes = String(element.className ?? '').trim();
      return `${element.tagName.toLowerCase()}${classes ? `.${classes.replace(/\s+/g, '.')}` : ''}`;
    };
    const visibleElements = Array.from(document.querySelectorAll('body *'))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      });
    const overflowingElements = visibleElements
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .slice(0, 10)
      .map((element) => ({
        selector: elementLabel(element),
        text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 120),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth
      }));
    const minTargetSize = 24;
    const undersizedTargets = visibleElements
      .filter((element) => element.matches('button, a[href], input, select, textarea, summary, [role="button"]'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector: elementLabel(element),
          text: element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      })
      .filter((item) => item.width < minTargetSize || item.height < minTargetSize)
      .slice(0, 10);
    const cssSelectors = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        cssSelectors.push(...Array.from(sheet.cssRules)
          .map((rule) => rule.selectorText)
          .filter(Boolean));
      } catch {
        continue;
      }
    }
    const selectorIncludes = (text) => cssSelectors.some((selector) => selector.includes(text));
    const stateChecks = shouldCheckStates
      ? {
          hover: selectorIncludes(':hover'),
          focus: selectorIncludes(':focus-visible'),
          active: selectorIncludes(':active'),
          disabled: selectorIncludes(':disabled') && document.querySelectorAll('button:disabled, [aria-disabled="true"]').length > 0,
          loading: pageText.includes(expectedStateTexts.loading),
          empty: pageText.includes(expectedStateTexts.empty),
          error: pageText.includes(expectedStateTexts.error)
        }
      : undefined;

    return {
      title: document.title,
      textLength: pageText.length,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      overflowingElements,
      minTargetSize,
      undersizedTargets,
      stateChecks
    };
  }, { requireStateChecks, stateTexts });

  await page.screenshot({ path: screenshotPath, fullPage: true });

  return {
    viewport: viewportLabel(viewport),
    screenshotPath,
    screenshotBytes: statSync(screenshotPath).size,
    ...summary
  };
};

const validateSummary = (summary, requireStateChecks) => {
  const errors = [];

  if (!summary.title) {
    errors.push(`${summary.viewport}: title is empty`);
  }

  if (!Number.isFinite(summary.textLength) || summary.textLength < 1) {
    errors.push(`${summary.viewport}: page text is empty`);
  }

  if (summary.bodyScrollWidth > summary.windowWidth + 1 || summary.documentScrollWidth > summary.windowWidth + 1) {
    errors.push(`${summary.viewport}: page has horizontal document overflow`);
  }

  if (summary.overflowingElements.length > 0) {
    errors.push(`${summary.viewport}: ${summary.overflowingElements.length} elements have horizontal text overflow`);
  }

  if (summary.undersizedTargets.length > 0) {
    errors.push(`${summary.viewport}: ${summary.undersizedTargets.length} interactive targets are below ${summary.minTargetSize}x${summary.minTargetSize} CSS px`);
  }

  if (!summary.screenshotPath || !Number.isFinite(summary.screenshotBytes) || summary.screenshotBytes < 1) {
    errors.push(`${summary.viewport}: screenshot is missing`);
  }

  if (requireStateChecks) {
    for (const [stateName, ok] of Object.entries(summary.stateChecks ?? {})) {
      if (!ok) {
        errors.push(`${summary.viewport}: missing ${stateName} state evidence`);
      }
    }
  }

  return errors;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const htmlPath = path.resolve(options.htmlPath);
  if (!existsSync(htmlPath) || !statSync(htmlPath).isFile()) {
    fail(`HTML fixture not found: ${htmlPath}`);
  }
  const { stateConfigPath, stateTexts } = loadStateTexts({
    htmlPath,
    explicitStateConfigPath: options.stateConfigPath
  });
  const screenshotStem = path.basename(htmlPath, path.extname(htmlPath));

  const screenshotDir = path.resolve(options.screenshotDir);
  mkdirSync(screenshotDir, { recursive: true });

  const { playwright, moduleDir } = resolvePlaywright(options.moduleDir);
  const browserExecutable = detectBrowserExecutable(options.browserExecutable);
  const { chromium } = playwright;
  let browser;
  try {
    browser = await chromium.launch(buildBrowserLaunchOptions({
      browserExecutable
    }));
  } catch (error) {
    throw new Error([
      'Could not launch a browser for frontend design boost fixture QA.',
      'Pass --browser-executable <path> or set DECKGEN_BROWSER_EXECUTABLE.',
      `Detected browser executable: ${browserExecutable || '(none)'}.`,
      `Playwright module dir: ${moduleDir || '(script resolver)'}.`,
      error.message
    ].join(' '));
  }

  const summaries = [];
  try {
    for (const viewport of options.viewports) {
      const page = await browser.newPage({ viewport });
      await page.goto(pathToFileURL(htmlPath).href);
      await page.waitForLoadState('load');
      summaries.push(await summarizePage({
        page,
        viewport,
        screenshotPath: screenshotPathForViewport(screenshotDir, viewport, screenshotStem),
        requireStateChecks: options.requireStateChecks,
        stateTexts
      }));
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const errors = summaries.flatMap((summary) => validateSummary(summary, options.requireStateChecks));
  const result = {
    ok: errors.length === 0,
    htmlPath,
    stateConfigPath,
    screenshotDir,
    summaries,
    errors
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(errors.length === 0 ? 0 : 1);
};

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exit(1);
});
