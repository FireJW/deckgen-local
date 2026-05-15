# HTML Anything Local Template Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only template lab in `deckgen-local` that evaluates selected `html-anything` skills against real fixtures and writes reviewable reports under `.tmp/html-anything-lab/`.

**Architecture:** Keep the lab separate from production renderers. The first slice loads a static upstream template index, validates it, compares selected template metadata against deckgen fixtures loaded through the existing source loader, and writes a markdown report plus machine-readable JSON. No upstream Next.js app is invoked, and no renderer promotion happens in this plan.

**Tech Stack:** Node ESM, `node:test`, existing deckgen source loader, JSON/Markdown file output, local `.tmp` run directories, minimal CLI parsing.

---

## File Structure

- Create `fixtures/html-anything-lab/template-index.json`
  - Owns the checked-in upstream template metadata for the first evaluation set.
- Create `src/lab/html-anything/template-index.mjs`
  - Loads and validates the lab template index.
- Create `src/lab/html-anything/evaluate.mjs`
  - Compares one template entry against one loaded deckgen source package and classifies promote/hold/reject.
- Create `src/lab/html-anything/report.mjs`
  - Renders the markdown report and per-source comparison summaries.
- Create `src/lab/html-anything/run.mjs`
  - Creates the lab run directory, loads sources, executes comparisons, and writes artifacts.
- Create `scripts/html-anything-lab.mjs`
  - Thin CLI wrapper over the lab runner.
- Modify `package.json`
  - Add a `lab:html-anything` script.
- Create `tests/html-anything-lab.test.mjs`
  - Covers index validation, evaluation, report output, and CLI smoke.
- Modify `README.md`
  - Document the new local lab command and where its artifacts land.

---

### Task 1: Add The Static Upstream Template Index

**Files:**
- Create: `fixtures/html-anything-lab/template-index.json`
- Create: `src/lab/html-anything/template-index.mjs`
- Test: `tests/html-anything-lab.test.mjs`

- [ ] **Step 1: Write the failing index tests**

Add these tests to `tests/html-anything-lab.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadHtmlAnythingTemplateIndex, validateHtmlAnythingTemplateIndex } from '../src/lab/html-anything/template-index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('validateHtmlAnythingTemplateIndex accepts the checked-in fixture', () => {
  const index = loadHtmlAnythingTemplateIndex(path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json'));

  const result = validateHtmlAnythingTemplateIndex(index);

  assert.equal(result.ok, true);
  assert.equal(result.templates.length, 7);
  assert.equal(result.templates[0].id, 'deck-swiss-international');
});

test('validateHtmlAnythingTemplateIndex rejects missing source metadata', () => {
  const result = validateHtmlAnythingTemplateIndex({
    schema: 'html_anything_template_index/v1',
    source: {},
    templates: [{ id: 'broken-template' }]
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /source/i);
});

test('loadHtmlAnythingTemplateIndex rejects invalid json', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'deckgen-html-anything-index-'));
  const file = path.join(dir, 'template-index.json');
  writeFileSync(file, '{not json', 'utf8');

  assert.throws(() => loadHtmlAnythingTemplateIndex(file), /invalid json/i);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
```

Expected: FAIL because `src/lab/html-anything/template-index.mjs` does not exist yet.

- [ ] **Step 3: Add the checked-in index fixture**

Create `fixtures/html-anything-lab/template-index.json` with this content:

```json
{
  "schema": "html_anything_template_index/v1",
  "source": {
    "repo": "https://github.com/nexu-io/html-anything",
    "commit": "a3fac16d31ed75addce4bd2d9c7097ce075bb71d"
  },
  "templates": [
    {
      "id": "deck-swiss-international",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/deck-swiss-international/example.html",
      "example_sha256": "77b78c1766fa2d75a9310e01642047aee4da61219de57f2d1f0d0d10270886a5",
      "destination": "deck-theme",
      "supported_profiles": ["briefing", "learning", "article"],
      "contract_fields": ["title", "slides[].headline", "slides[].body"],
      "decision": "promote"
    },
    {
      "id": "deck-guizang-editorial",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/deck-guizang-editorial/example.html",
      "example_sha256": "42c1939174ecd9498c69a7c8b2940c9063361c512d8a2dae5f18d1a6c544c755",
      "destination": "deck-theme",
      "supported_profiles": ["briefing", "article"],
      "contract_fields": ["title", "slides[].headline", "slides[].body", "theme.renderer_hint"],
      "decision": "hold"
    },
    {
      "id": "article-magazine",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/article-magazine/example.html",
      "example_sha256": "812682183f2173cce7b571a6da96bd73370c029aa7cce88bfe63d1d383f11976",
      "destination": "article-html",
      "supported_profiles": ["article"],
      "contract_fields": ["title", "content", "source_refs[]"],
      "decision": "promote"
    },
    {
      "id": "card-xiaohongshu",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/card-xiaohongshu/example.html",
      "example_sha256": "369cf9fec135b30267ad2bece567abc00bbfdbeae0f6498de11198439be1e8a3",
      "destination": "social-card",
      "supported_profiles": ["article", "briefing"],
      "contract_fields": ["title", "content", "evidence_refs[]"],
      "decision": "hold"
    },
    {
      "id": "social-carousel",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/social-carousel/example.html",
      "example_sha256": "dc7b2506cc469d1f5b5f4d4b1f1e73b3a600b114faf9e65ea5772afa6994771d",
      "destination": "social-card",
      "supported_profiles": ["article"],
      "contract_fields": ["title", "slides[].headline", "slides[].body"],
      "decision": "hold"
    },
    {
      "id": "data-report",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/data-report/example.html",
      "example_sha256": "f006f72762d2a7322175e37d9d568dd5c85610f2b0d768210b09ffa7c617c252",
      "destination": "briefing-layout",
      "supported_profiles": ["briefing", "article"],
      "contract_fields": ["title", "tables[]", "slides[].body"],
      "decision": "promote"
    },
    {
      "id": "video-hyperframes",
      "example_url": "https://github.com/nexu-io/html-anything/blob/a3fac16d31ed75addce4bd2d9c7097ce075bb71d/src/lib/templates/skills/video-hyperframes/example.html",
      "example_sha256": "5bcf19524b5e779eb2e656d0a00f8b8bbffa1b810ec12c064b038f2bb5a7e358",
      "destination": "export-adapter",
      "supported_profiles": ["article", "briefing", "learning"],
      "contract_fields": ["title", "slides[].headline", "slides[].body"],
      "decision": "reject"
    }
  ]
}
```

- [ ] **Step 4: Implement the index loader and validator**

Create `src/lab/html-anything/template-index.mjs` with:

```js
import { readFileSync } from 'node:fs';

export class HtmlAnythingLabError extends Error {
  constructor(message) {
    super(message);
    this.name = 'HtmlAnythingLabError';
  }
}

export function loadHtmlAnythingTemplateIndex(filePath) {
  let raw = '';
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new HtmlAnythingLabError(`Could not read template index: ${error.message}`);
  }

  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new HtmlAnythingLabError(`Invalid JSON in template index: ${filePath}`);
  }

  return value;
}

export function validateHtmlAnythingTemplateIndex(index) {
  if (!index || index.schema !== 'html_anything_template_index/v1') {
    return { ok: false, error: 'template index schema must be html_anything_template_index/v1' };
  }

  if (!index.source || typeof index.source.repo !== 'string' || typeof index.source.commit !== 'string') {
    return { ok: false, error: 'template index source metadata is required' };
  }

  if (!Array.isArray(index.templates) || index.templates.length === 0) {
    return { ok: false, error: 'template index must include templates[]' };
  }

  for (const template of index.templates) {
    if (typeof template.id !== 'string' || !template.id) {
      return { ok: false, error: 'template id is required' };
    }
    if (typeof template.example_url !== 'string' || typeof template.example_sha256 !== 'string') {
      return { ok: false, error: `template ${template.id} requires example_url and example_sha256` };
    }
    if (!Array.isArray(template.supported_profiles) || template.supported_profiles.length === 0) {
      return { ok: false, error: `template ${template.id} requires supported_profiles[]` };
    }
    if (!Array.isArray(template.contract_fields) || template.contract_fields.length === 0) {
      return { ok: false, error: `template ${template.id} requires contract_fields[]` };
    }
    if (!['promote', 'hold', 'reject'].includes(template.decision)) {
      return { ok: false, error: `template ${template.id} has invalid decision` };
    }
  }

  return { ok: true, templates: index.templates };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
```

Expected: the index tests pass and the report/evaluation tests still fail until later tasks land.

- [ ] **Step 6: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add fixtures/html-anything-lab/template-index.json src/lab/html-anything/template-index.mjs tests/html-anything-lab.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: add html-anything template index"
```

---

### Task 2: Add Source Evaluation And Report Generation

**Files:**
- Create: `src/lab/html-anything/evaluate.mjs`
- Create: `src/lab/html-anything/report.mjs`
- Modify: `tests/html-anything-lab.test.mjs`

- [ ] **Step 1: Write the failing evaluation and report tests**

Add these tests to `tests/html-anything-lab.test.mjs`:

```js
import { buildHtmlAnythingLabReport } from '../src/lab/html-anything/report.mjs';
import { evaluateHtmlAnythingTemplate } from '../src/lab/html-anything/evaluate.mjs';

test('evaluateHtmlAnythingTemplate classifies a source deterministically', () => {
  const template = {
    id: 'article-magazine',
    supported_profiles: ['article'],
    contract_fields: ['title', 'content', 'source_refs[]'],
    decision: 'promote'
  };
  const sourcePackage = {
    sourceType: 'publish-package',
    profile: 'article',
    contract: {
      title: 'Sample title',
      content: 'Sample content',
      source_refs: [{ id: 'primary', path: 'content.md' }]
    }
  };

  const result = evaluateHtmlAnythingTemplate({ template, sourcePackage });

  assert.equal(result.status, 'promote');
  assert.deepEqual(result.missingContractFields, []);
  assert.equal(result.supportsProfile, true);
});

test('evaluateHtmlAnythingTemplate marks unsupported profiles as hold or reject', () => {
  const template = {
    id: 'video-hyperframes',
    supported_profiles: ['learning'],
    contract_fields: ['title', 'slides[].headline'],
    decision: 'reject'
  };
  const sourcePackage = {
    sourceType: 'generic-markdown',
    profile: 'briefing',
    contract: { title: 'Briefing', slides: [] }
  };

  const result = evaluateHtmlAnythingTemplate({ template, sourcePackage });

  assert.equal(result.status, 'reject');
  assert.equal(result.supportsProfile, false);
});

test('buildHtmlAnythingLabReport renders a comparison summary', () => {
  const report = buildHtmlAnythingLabReport({
    runId: '2026-05-14T12-00-00Z-test',
    index: {
      source: { repo: 'https://github.com/nexu-io/html-anything', commit: 'a3fac16d31ed75addce4bd2d9c7097ce075bb71d' }
    },
    results: [{
      sourcePath: 'fixtures/source-packages/publish-package/basic',
      sourceType: 'publish-package',
      profile: 'article',
      templateResults: [{
        id: 'article-magazine',
        status: 'promote',
        reason: 'profile supported and all required contract fields are available'
      }]
    }]
  });

  assert.match(report, /HTML Anything Local Template Lab/);
  assert.match(report, /article-magazine/);
  assert.match(report, /promote/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
```

Expected: FAIL because the evaluation and report modules do not exist yet.

- [ ] **Step 3: Implement the evaluation module**

Create `src/lab/html-anything/evaluate.mjs` with these exported helpers:

```js
const hasField = (contract, field) => {
  const parts = String(field).split('.');

  const walk = (value, index) => {
    if (index >= parts.length) {
      return value !== undefined;
    }

    const part = parts[index];
    if (part.endsWith('[]')) {
      const key = part.slice(0, -2);
      const next = value?.[key];
      if (!Array.isArray(next)) {
        return false;
      }
      if (index === parts.length - 1) {
        return true;
      }
      return next.some((item) => walk(item, index + 1));
    }

    if (value == null || !Object.prototype.hasOwnProperty.call(value, part)) {
      return false;
    }

    return index === parts.length - 1 ? true : walk(value[part], index + 1);
  };

  return walk(contract, 0);
};

export function evaluateHtmlAnythingTemplate({ template, sourcePackage }) {
  const missingContractFields = template.contract_fields.filter((field) => !hasField(sourcePackage.contract, field));
  const supportsProfile = template.supported_profiles.includes(sourcePackage.profile);
  const status = !supportsProfile ? 'reject' : missingContractFields.length > 0 ? 'hold' : template.decision;
  const reason = !supportsProfile
    ? `profile ${sourcePackage.profile} is not in supported_profiles`
    : missingContractFields.length > 0
      ? `missing contract fields: ${missingContractFields.join(', ')}`
      : template.decision === 'promote'
        ? 'profile supported and all required contract fields are available'
        : template.decision === 'hold'
          ? 'template is a candidate, but it stays in the lab until a promotion review'
          : 'template is intentionally rejected for the first slice';

  return {
    id: template.id,
    destination: template.destination,
    status,
    reason,
    supportsProfile,
    missingContractFields
  };
}
```

- [ ] **Step 4: Implement the report module**

Create `src/lab/html-anything/report.mjs` with:

```js
const renderList = (items) => items.length === 0
  ? '- none'
  : items.map((item) => `- ${item}`).join('\n');

export function buildHtmlAnythingLabReport({ runId, index, results }) {
  const lines = [];
  lines.push('# HTML Anything Local Template Lab');
  lines.push('');
  lines.push(`Run id: ${runId}`);
  lines.push(`Upstream repo: ${index.source.repo}`);
  lines.push(`Upstream commit: ${index.source.commit}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Source | Profile | Template | Status | Reason |');
  lines.push('| --- | --- | --- | --- | --- |');

  for (const sourceResult of results) {
    for (const templateResult of sourceResult.templateResults) {
      lines.push(`| ${sourceResult.sourceType} | ${sourceResult.profile} | ${templateResult.id} | ${templateResult.status} | ${templateResult.reason} |`);
    }
  }

  lines.push('');
  lines.push('## Sources');
  lines.push('');

  for (const sourceResult of results) {
    lines.push(`### ${sourceResult.sourceType}`);
    lines.push('');
    lines.push(`Source path: ${sourceResult.sourcePath}`);
    lines.push(`Profile: ${sourceResult.profile}`);
    lines.push('');
    lines.push('### Template outcomes');
    lines.push('');
    for (const templateResult of sourceResult.templateResults) {
      lines.push(`- ${templateResult.id}: ${templateResult.status}`);
      lines.push(`  - Reason: ${templateResult.reason}`);
      lines.push(`  - Destination: ${templateResult.destination}`);
      lines.push(`  - Missing fields: ${renderList(templateResult.missingContractFields)}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
```

Expected: evaluation and report tests pass once the modules exist.

- [ ] **Step 6: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add src/lab/html-anything/evaluate.mjs src/lab/html-anything/report.mjs tests/html-anything-lab.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: add html-anything evaluation report"
```

---

### Task 3: Add The Lab Runner And CLI Script

**Files:**
- Create: `src/lab/html-anything/run.mjs`
- Create: `scripts/html-anything-lab.mjs`
- Modify: `package.json`
- Modify: `tests/html-anything-lab.test.mjs`

- [ ] **Step 1: Write the failing runner and CLI tests**

Add these tests to `tests/html-anything-lab.test.mjs`:

```js
import { spawnSync } from 'node:child_process';
import { loadHtmlAnythingLabRun } from '../src/lab/html-anything/run.mjs';

test('loadHtmlAnythingLabRun writes a report under .tmp/html-anything-lab', () => {
  const result = loadHtmlAnythingLabRun({
    workdir: root,
    templateIndexPath: path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json'),
    sourcePaths: [
      path.join(root, 'fixtures', 'generic-markdown', 'briefing.md'),
      path.join(root, 'fixtures', 'source-packages', 'publish-package', 'basic')
    ]
  });

  assert.equal(result.ok, true);
  assert.match(result.runDir, /\.tmp[\\/]+html-anything-lab[\\/]+/);
  assert.ok(result.reportPath.endsWith('report.md'));
});

test('html-anything-lab cli prints help', () => {
  const cli = path.join(root, 'scripts', 'html-anything-lab.mjs');
  const result = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /html-anything lab/);
  assert.match(result.stdout, /--source/);
  assert.match(result.stdout, /--template-index/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
```

Expected: FAIL because the runner and CLI do not exist yet.

- [ ] **Step 3: Implement the runner**

Create `src/lab/html-anything/run.mjs` with:

```js
import { randomUUID as defaultRandomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadSourcePackage } from '../../cli/source-loader.mjs';
import { evaluateHtmlAnythingTemplate } from './evaluate.mjs';
import { buildHtmlAnythingLabReport } from './report.mjs';
import { loadHtmlAnythingTemplateIndex, validateHtmlAnythingTemplateIndex } from './template-index.mjs';

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const timestampRunIdPart = (date) => date.toISOString().replace(/[:.]/g, '-');

export function createHtmlAnythingLabRunDirectory(workdir, options = {}) {
  const now = options.now ?? (() => new Date());
  const randomUUID = options.randomUUID ?? defaultRandomUUID;
  const runRoot = path.resolve(workdir, '.tmp', 'html-anything-lab');
  mkdirSync(runRoot, { recursive: true });
  const runId = `${timestampRunIdPart(now())}-${randomUUID()}`;
  const runDir = path.join(runRoot, runId);
  mkdirSync(runDir);
  return { runId, runDir };
}

export function loadHtmlAnythingLabRun({ workdir, templateIndexPath, sourcePaths, now, randomUUID }) {
  const index = loadHtmlAnythingTemplateIndex(templateIndexPath);
  const validation = validateHtmlAnythingTemplateIndex(index);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const { runId, runDir } = createHtmlAnythingLabRunDirectory(workdir, { now, randomUUID });
  const sources = sourcePaths.map((sourcePath) => loadSourcePackage({ source: sourcePath }));
  const results = sources.map((sourcePackage) => ({
    sourcePath: sourcePackage.sourcePath,
    sourceType: sourcePackage.sourceType,
    profile: sourcePackage.profile,
    templateResults: validation.templates.map((template) => evaluateHtmlAnythingTemplate({ template, sourcePackage }))
  }));

  const report = buildHtmlAnythingLabReport({ runId, index, results });
  writeJson(path.join(runDir, 'request.json'), {
    command: 'html-anything-lab',
    templateIndexPath,
    sourcePaths
  });
  writeJson(path.join(runDir, 'upstream-template-index.json'), index);
  writeFileSync(path.join(runDir, 'report.md'), report, 'utf8');
  writeJson(path.join(runDir, 'run_result.json'), {
    ok: true,
    runId,
    runDir,
    reportPath: path.join(runDir, 'report.md')
  });

  return { ok: true, runId, runDir, reportPath: path.join(runDir, 'report.md') };
}
```

- [ ] **Step 4: Implement the CLI wrapper**

Create `scripts/html-anything-lab.mjs` with:

```js
#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadHtmlAnythingLabRun } from '../src/lab/html-anything/run.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const help = 'html-anything lab --template-index <path> --source <path> [--source <path>] [--workdir <path>] [--json]';
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  process.stdout.write(`${help}\n`);
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
}

const options = { sourcePaths: [] };
for (let i = 0; i < args.length; i += 1) {
  const flag = args[i];
  if (flag === '--json') {
    options.json = true;
    continue;
  }
  const value = args[i + 1];
  if (!value || value.startsWith('--')) {
    process.stderr.write(`Missing value for ${flag}\n${help}\n`);
    process.exit(1);
  }
  if (flag === '--template-index') options.templateIndexPath = path.resolve(root, value);
  else if (flag === '--source') options.sourcePaths.push(path.resolve(root, value));
  else if (flag === '--workdir') options.workdir = path.resolve(root, value);
  else {
    process.stderr.write(`Unsupported option: ${flag}\n${help}\n`);
    process.exit(1);
  }
  i += 1;
}

if (!options.templateIndexPath) options.templateIndexPath = path.join(root, 'fixtures', 'html-anything-lab', 'template-index.json');
if (options.sourcePaths.length === 0) {
  options.sourcePaths = [
    path.join(root, 'fixtures', 'generic-markdown', 'briefing.md'),
    path.join(root, 'fixtures', 'source-packages', 'publish-package', 'basic')
  ];
}
if (!options.workdir) options.workdir = root;

const result = loadHtmlAnythingLabRun(options);
if (!result.ok) {
  process.stderr.write(`${result.error}\n`);
  process.exit(1);
}

process.stdout.write(`${options.json ? JSON.stringify(result, null, 2) : `written ${result.runDir}`}\n`);
```

- [ ] **Step 5: Wire the package script**

Add this script to `package.json`:

```json
{
  "scripts": {
    "lab:html-anything": "node scripts/html-anything-lab.mjs"
  }
}
```

- [ ] **Step 6: Run the tests and CLI smoke**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
npm.cmd run lab:html-anything -- --json
```

Expected: the test suite passes and the CLI prints a JSON result with a `.tmp/html-anything-lab/<run-id>/report.md` path.

- [ ] **Step 7: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add src/lab/html-anything/run.mjs scripts/html-anything-lab.mjs package.json tests/html-anything-lab.test.mjs
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "feat: add html-anything lab runner"
```

---

### Task 4: Document The Lab And Verify The Full Slice

**Files:**
- Modify: `README.md`
- Test: `tests/html-anything-lab.test.mjs`

- [ ] **Step 1: Add README usage text**

Add a short section to `README.md` near the current usage examples:

```md
### HTML Anything Template Lab

Compare selected `html-anything` skills against local fixtures and write a review report under `.tmp/html-anything-lab/<run-id>/`.

```powershell
npm.cmd run lab:html-anything -- --json
```

Use `--template-index <path>` to test a different checked-in index file and `--source <path>` to point the lab at additional local fixtures.
```

- [ ] **Step 2: Run the full targeted test file**

Run:

```powershell
node --test tests\html-anything-lab.test.mjs
```

Expected: all tests in the new file pass.

- [ ] **Step 3: Run the repo test suite slice that exercises the touched surface**

Run:

```powershell
npm.cmd test
```

Expected: existing deckgen-local tests still pass.

- [ ] **Step 4: Commit**

```powershell
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local add README.md
git -c safe.directory=D:/Users/rickylu/dev/deckgen-local commit -m "docs: document html-anything lab"
```

---

## Self-Review Notes

- Spec coverage: the plan covers the lab index, source evaluation, markdown report, run directory output, CLI wrapper, package script, and README usage note.
- Boundary check: production renderers are untouched. The plan does not add any `html-anything` dependency to `src/renderers/` or the WeChat/PPTX export paths.
- Placeholder scan: no unfinished-work markers or open-ended test steps remain. Every task names files, exact commands, and the expected result.
- Type consistency: the helper names are stable across tasks: `loadHtmlAnythingTemplateIndex`, `validateHtmlAnythingTemplateIndex`, `evaluateHtmlAnythingTemplate`, `buildHtmlAnythingLabReport`, `loadHtmlAnythingLabRun`, and `createHtmlAnythingLabRunDirectory`.
