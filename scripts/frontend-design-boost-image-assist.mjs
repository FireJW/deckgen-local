#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const defaultBriefPath = path.join(root, 'fixtures', 'frontend-design-boost', 'image-assisted-brief.md');
const defaultOutDir = path.join(root, '.tmp', 'frontend-design-boost', 'image-prompt-pack');
const defaultAssetOutDir = path.join(root, 'output', 'imagegen', 'frontend-design-boost');

const usage = [
  'frontend-design-boost-image-assist [--brief <path>] [--reference-intake <path>] [--out-dir <dir>] [--asset-out-dir <dir>]',
  '',
  'Build a prompt pack for gpt-image-2 frontend-design workflows.',
  'The script does not call the API; it writes prompts, a README, preview HTML, and command snippets.'
].join('\n');

const fail = (message) => {
  process.stderr.write(`${message}\nUsage: ${usage}\n`);
  process.exit(1);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    briefPath: defaultBriefPath,
    referenceIntakePath: '',
    outDir: defaultOutDir,
    assetOutDir: defaultAssetOutDir
  };

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') {
      process.stdout.write(`${usage}\n`);
      process.exit(0);
    }

    const value = args[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      fail(`Unexpected or missing value near ${flag ?? ''}.`);
    }

    if (flag === '--brief') {
      options.briefPath = value;
    } else if (flag === '--reference-intake') {
      options.referenceIntakePath = value;
    } else if (flag === '--out-dir') {
      options.outDir = value;
    } else if (flag === '--asset-out-dir') {
      options.assetOutDir = value;
    } else {
      fail(`Unsupported option: ${flag}`);
    }

    index += 1;
  }

  return options;
};

const readBrief = (briefPath) => {
  if (!existsSync(briefPath)) {
    fail(`Missing brief: ${briefPath}`);
  }

  return readFileSync(briefPath, 'utf8').replace(/\r\n/g, '\n');
};

const readReferenceIntake = (referenceIntakePath) => {
  if (!referenceIntakePath) return '';
  if (!existsSync(referenceIntakePath)) {
    fail(`Missing reference intake: ${referenceIntakePath}`);
  }

  return readFileSync(referenceIntakePath, 'utf8').replace(/\r\n/g, '\n');
};

const extractTitle = (text) => {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Frontend Design Boost image prompt pack';
};

const outputRelative = (absolutePath) => path.relative(root, absolutePath).split(path.sep).join('/');

const cleanBriefLine = (line) =>
  line
    .replace(/^[-*]\s+/, '')
    .replace(/^#+\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

const compactItems = (items, limit = 5) => items.filter(Boolean).slice(0, limit).join('; ');

const extractSections = (text) => {
  const sections = new Map([['Intro', []]]);
  let current = 'Intro';

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    const heading = line.match(/^#{2,6}\s+(.+)$/);
    if (heading) {
      current = heading[1].trim();
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }

    if (!line || line.startsWith('# ')) continue;
    sections.get(current).push(cleanBriefLine(line));
  }

  return sections;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractInlineField = (text, label) => {
  const match = text.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, 'mi'));
  return match ? cleanBriefLine(match[1]) : '';
};

const extractLabeledItems = (text, label) => {
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const match = line.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.*)$`, 'i'));
    if (!match) continue;
    if (match[1]) return [cleanBriefLine(match[1])];

    const items = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const candidate = lines[cursor].trim();
      if (!candidate) {
        if (items.length > 0) break;
        continue;
      }
      if (/^#{1,6}\s+/.test(candidate)) break;
      if (/^[A-Z][A-Za-z ]+:\s*$/.test(candidate) && items.length > 0) break;
      if (/^[A-Z][A-Za-z ]+:\s+\S/.test(candidate) && items.length > 0) break;

      items.push(cleanBriefLine(candidate));
    }
    return items;
  }
  return [];
};

const sectionItems = (sections, matcher) => {
  for (const [name, items] of sections.entries()) {
    if (matcher.test(name)) return items;
  }
  return [];
};

const buildBriefProfile = ({ text, title }) => {
  const sections = extractSections(text);
  const intro = sectionItems(sections, /^Intro$/i);
  const productShape = sectionItems(sections, /product shape/i);
  const requiredContent = [
    ...sectionItems(sections, /required content/i),
    ...sectionItems(sections, /required pattern/i),
    ...extractLabeledItems(text, 'Required outputs')
  ];
  const visualRules = [
    ...sectionItems(sections, /visual rules/i),
    ...sectionItems(sections, /constraints/i),
    ...extractLabeledItems(text, 'Design constraints')
  ];
  const interactionRules = [
    ...sectionItems(sections, /interaction rules/i),
    ...sectionItems(sections, /required states/i)
  ];
  const avoid = extractLabeledItems(text, 'Avoid');
  const audience = extractLabeledItems(text, 'Audience');
  const primaryAction = extractLabeledItems(text, 'Primary action');

  return {
    title,
    product: extractInlineField(text, 'Product') || '',
    pageType: extractInlineField(text, 'Page type') || compactItems(productShape, 3) || cleanBriefLine(intro[0] ?? ''),
    audience: compactItems(audience, 4) || 'frontend designers, implementers, and reviewers',
    primaryAction: compactItems(primaryAction, 4) || cleanBriefLine(intro[1] ?? intro[0] ?? ''),
    requiredContent: compactItems(requiredContent, 6),
    visualRules: compactItems(visualRules, 6),
    interactionRules: compactItems(interactionRules, 6),
    avoid: compactItems(avoid, 6) || compactItems(visualRules, 4),
    signals: [
      ...intro.slice(0, 2),
      ...productShape.slice(0, 3),
      ...requiredContent.slice(0, 4),
      ...visualRules.slice(0, 3),
      ...interactionRules.slice(0, 3)
    ].filter(Boolean).slice(0, 12)
  };
};

const buildBriefContext = (profile) => [
  profile.pageType ? `Page type: ${profile.pageType}` : '',
  profile.audience ? `Audience: ${profile.audience}` : '',
  profile.primaryAction ? `Primary action: ${profile.primaryAction}` : '',
  profile.requiredContent ? `Required content: ${profile.requiredContent}` : '',
  profile.visualRules ? `Visual rules: ${profile.visualRules}` : '',
  profile.interactionRules ? `Interaction rules: ${profile.interactionRules}` : '',
  profile.avoid ? `Avoid: ${profile.avoid}` : ''
].filter(Boolean).join('\n');

const emptyReferenceProfile = {
  enabled: false,
  source: '',
  sourceFamily: '',
  selectedSources: '',
  extract: '',
  promptCues: '',
  avoid: '',
  adoptionMode: '',
  signals: []
};

const buildReferenceProfile = ({ text, referenceIntakePath }) => {
  if (!text) return { ...emptyReferenceProfile };

  const sections = extractSections(text);
  const selectedSources = [
    ...extractLabeledItems(text, 'Selected sources'),
    ...sectionItems(sections, /selected sources/i)
  ];
  const sourceFamily = [
    ...extractLabeledItems(text, 'Source family'),
    ...sectionItems(sections, /source family/i)
  ];
  const extract = [
    ...extractLabeledItems(text, 'What to extract'),
    ...sectionItems(sections, /what to extract/i)
  ];
  const promptCues = [
    ...extractLabeledItems(text, 'Prompt cues'),
    ...sectionItems(sections, /prompt cues/i)
  ];
  const avoid = [
    ...extractLabeledItems(text, 'What not to copy'),
    ...sectionItems(sections, /what not to copy/i)
  ];
  const adoptionMode = [
    ...extractLabeledItems(text, 'Adoption mode'),
    ...sectionItems(sections, /adoption mode/i)
  ];

  return {
    enabled: true,
    source: outputRelative(path.resolve(referenceIntakePath)),
    sourceFamily: compactItems(sourceFamily, 4),
    selectedSources: compactItems(selectedSources, 8),
    extract: compactItems(extract, 8),
    promptCues: compactItems(promptCues, 8),
    avoid: compactItems(avoid, 8),
    adoptionMode: compactItems(adoptionMode, 4),
    signals: [
      ...selectedSources.slice(0, 4),
      ...sourceFamily.slice(0, 2),
      ...extract.slice(0, 4),
      ...promptCues.slice(0, 4),
      ...avoid.slice(0, 3),
      ...adoptionMode.slice(0, 2)
    ].filter(Boolean).slice(0, 16)
  };
};

const buildReferenceContext = (profile) => {
  if (!profile?.enabled) return '';

  return [
    'Reference intake: selected external sources guide visual direction only.',
    profile.sourceFamily ? `Source family: ${profile.sourceFamily}` : '',
    profile.selectedSources ? `Selected sources: ${profile.selectedSources}` : '',
    profile.extract ? `Extract: ${profile.extract}` : '',
    profile.promptCues ? `Prompt cues: ${profile.promptCues}` : '',
    profile.avoid ? `Do not copy: ${profile.avoid}` : '',
    profile.adoptionMode ? `Adoption mode: ${profile.adoptionMode}` : ''
  ].filter(Boolean).join('\n');
};

const relativeFrom = (basePath, targetPath) => path.relative(basePath, targetPath).split(path.sep).join('/');

const buildAssetSelection = ({ title, briefPath, briefProfile, briefSummary, referenceProfile, outDir, assetOutDir, assets }) => {
  const roleMetadata = [
    {
      role: 'visual-direction',
      consumerSurface: 'design direction review',
      fit: 'reference',
      fallback: 'Keep the prompt pack preview and extraction notes as the implementation anchor.'
    },
    {
      role: 'hero',
      consumerSurface: 'first viewport hero',
      fit: 'cover',
      fallback: 'Keep the hero copy, metrics, and controls visible if the asset is still pending.'
    },
    {
      role: 'empty-state',
      consumerSurface: 'supporting empty state',
      fit: 'contain',
      fallback: 'Keep the empty-state message and recovery action visible if the asset is still pending.'
    }
  ];

  const implementationTargets = assets.map((asset, index) => {
    const metadata = roleMetadata[index] ?? {
      role: `asset-${index + 1}`,
      consumerSurface: 'implementation surface',
      fit: 'contain',
      fallback: 'Keep the surface readable even when the generated asset is missing.'
    };
    const status = existsSync(asset.outputFile) ? 'ready' : 'pending';
    return {
      ...metadata,
      assetId: asset.id,
      label: asset.label,
      assetType: asset.assetType,
      useCase: asset.useCase,
      outputPath: outputRelative(asset.outputFile),
      projectPath: relativeFrom(outDir, asset.outputFile),
      promptPath: relativeFrom(outDir, asset.outputFile).replace(/\.png$/i, '.prompt.txt'),
      status,
      quality: asset.quality,
      size: asset.size,
      reviewNotes: [
        `Use this ${metadata.role} asset in ${metadata.consumerSurface}.`,
        `Keep the asset local to ${outputRelative(path.resolve(assetOutDir))}.`,
        metadata.fallback
      ]
    };
  });

  return {
    schema: 'frontend-design-boost-asset-selection/v1',
    title,
    sourceBrief: outputRelative(path.resolve(briefPath)),
    sourcePromptPack: 'image-prompts.json',
    projectAssetDirectory: outputRelative(path.resolve(assetOutDir)),
    generatedAt: new Date().toISOString(),
    briefSummary,
    briefProfile,
    referenceProfile,
    implementationTargets,
    notes: [
      'Use project-local asset paths when wiring the generated images into HTML, React, or Tailwind surfaces.',
      'Use the reference intake as prompt-shaping guidance only; do not copy external screenshots, brand assets, source code, or proprietary flows.',
      'Treat the visual-direction asset as a design reference, not implementation truth.',
      'Keep the selection manifest next to the prompt pack so implementation can stay deterministic.'
    ]
  };
};

const renderSelectionCard = (target) => {
  const statusClass = target.status === 'ready' ? 'chip-green' : 'chip-amber';
  const statusLabel = target.status === 'ready' ? 'ready' : 'pending';
  return `
        <article class="asset-card" data-asset-slot="${escapeHtml(target.role)}" data-asset-status="${escapeHtml(target.status)}">
          <div class="asset-card-head">
            <div>
              <p class="asset-label">${escapeHtml(target.role)}</p>
              <h3>${escapeHtml(target.assetType)}</h3>
            </div>
            <span class="chip ${statusClass}">${statusLabel}</span>
          </div>
          <div class="asset-preview">
            <img src="${escapeHtml(target.projectPath)}" alt="${escapeHtml(target.assetType)}" loading="lazy" />
            <div class="asset-fallback">
              <strong>${escapeHtml(target.assetType)}</strong>
              <span>${escapeHtml(target.outputPath)}</span>
              <span>${escapeHtml(target.fallback)}</span>
            </div>
          </div>
          <div class="asset-meta">
            <span class="chip chip-neutral">${escapeHtml(target.consumerSurface)}</span>
            <span class="chip chip-neutral">${escapeHtml(target.fit)}</span>
            <span class="chip chip-neutral">${escapeHtml(target.size)} / ${escapeHtml(target.quality)}</span>
          </div>
          <details>
            <summary>Implementation note</summary>
            <pre>${escapeHtml(target.reviewNotes.join('\n'))}</pre>
          </details>
        </article>`;
};

const renderAssetConsumptionDemo = ({ title, briefSummary, selection, manifest, outDir }) => {
  const pathMapRows = selection.implementationTargets.map((target) => `
              <li>
                <strong>${escapeHtml(target.role)}</strong>
                <span>${escapeHtml(target.outputPath)}</span>
              </li>`).join('\n');

  const assetCards = selection.implementationTargets.map(renderSelectionCard).join('\n');
  const demoTitle = `${title} asset consumption demo`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(demoTitle)}</title>
    <style>
      :root {
        --bg: #eef1eb;
        --surface: #ffffff;
        --surface-soft: #f7f8f4;
        --surface-muted: #f1f3ee;
        --text: #1f2937;
        --muted: #67727a;
        --border: #d8ddd3;
        --accent: #0f766e;
        --accent-soft: #d6ece8;
        --warn: #a16207;
        --warn-soft: #fef3c7;
        --success: #166534;
        --success-soft: #dcfce7;
        --shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
        --radius: 8px;
      }
      * { box-sizing: border-box; }
      html, body { min-height: 100%; }
      body {
        margin: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.15)), var(--bg);
        color: var(--text);
        font: 14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        letter-spacing: 0;
      }
      button {
        appearance: none;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        border-radius: var(--radius);
        font: inherit;
        letter-spacing: 0;
        padding: 9px 12px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 36px;
        cursor: pointer;
        box-shadow: var(--shadow);
        transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
      }
      button:hover { border-color: rgba(15, 118, 110, 0.36); background: #fbfcfa; box-shadow: 0 10px 20px rgba(15, 23, 42, 0.07); transform: translateY(-1px); }
      button:active { transform: translateY(0); box-shadow: var(--shadow); }
      button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      button:disabled { cursor: not-allowed; color: #94a3b8; background: #f5f6f4; box-shadow: none; transform: none; }
      .page {
        width: min(1400px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 40px;
      }
      .shell { display: grid; gap: 16px; }
      .panel {
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface);
        box-shadow: var(--shadow);
      }
      .topbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 18px;
      }
      .eyebrow {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 30px; line-height: 1.12; }
      .lede { margin-top: 8px; color: var(--muted); max-width: 72ch; }
      .chip-row, .meta-row, .status-row, .note-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--surface-soft);
        color: var(--text);
        font-size: 12px;
        white-space: nowrap;
      }
      .chip::before {
        content: "";
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        opacity: 0.9;
      }
      .chip-green { background: var(--success-soft); color: var(--success); }
      .chip-amber { background: var(--warn-soft); color: var(--warn); }
      .chip-neutral { color: var(--muted); }
      .summary-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .metric {
        padding: 14px;
        min-height: 104px;
        display: grid;
        gap: 8px;
      }
      .metric-label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .metric-value {
        font-size: 28px;
        line-height: 1;
      }
      .metric-value small {
        font-size: 13px;
        color: var(--muted);
      }
      .content {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
        align-items: start;
      }
      .stack { display: grid; gap: 16px; }
      .section {
        padding: 16px;
        display: grid;
        gap: 14px;
      }
      .section-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }
      .section-title { font-size: 18px; }
      .section-subtitle { color: var(--muted); margin-top: 4px; }
      .asset-grid {
        display: grid;
        gap: 12px;
      }
      .asset-card {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface-soft);
      }
      .asset-card-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
      }
      .asset-label {
        margin: 0 0 4px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .asset-preview {
        position: relative;
        min-height: 168px;
        border-radius: var(--radius);
        border: 1px dashed rgba(15, 118, 110, 0.28);
        background:
          linear-gradient(135deg, rgba(15, 118, 110, 0.11), rgba(255,255,255,0.9)),
          repeating-linear-gradient(135deg, rgba(15, 23, 42, 0.04) 0 10px, rgba(15, 23, 42, 0.02) 10px 20px);
        overflow: hidden;
        display: grid;
        place-items: center;
      }
      .asset-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .asset-fallback {
        position: absolute;
        inset: 0;
        padding: 14px;
        display: grid;
        align-content: center;
        justify-items: start;
        gap: 8px;
        text-align: left;
        background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(245,247,244,0.95));
        color: var(--text);
      }
      .asset-fallback strong { font-size: 14px; }
      .asset-fallback span { color: var(--muted); font-size: 12px; }
      .asset-card[data-asset-status="ready"] .asset-fallback { opacity: 0; pointer-events: none; }
      .asset-card[data-asset-status="pending"] img,
      .asset-card[data-asset-status="missing"] img { opacity: 0; }
      .asset-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      details {
        border-top: 1px solid var(--border);
        padding-top: 10px;
      }
      summary {
        cursor: pointer;
        color: var(--accent);
        list-style: none;
      }
      summary::-webkit-details-marker { display: none; }
      pre {
        margin: 10px 0 0;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: rgba(255,255,255,0.85);
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
      }
      .path-list {
        display: grid;
        gap: 8px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .path-list li {
        display: grid;
        gap: 2px;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--surface-soft);
      }
      .path-list strong { font-size: 13px; }
      .path-list span { color: var(--muted); font-size: 12px; word-break: break-word; }
      .checklist {
        margin: 0;
        padding-left: 18px;
        color: #334155;
      }
      .checklist li + li { margin-top: 8px; }
      .footer {
        color: var(--muted);
        font-size: 12px;
      }
      @media (max-width: 1080px) {
        .topbar {
          flex-direction: column;
        }
        .summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .content {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 720px) {
        .page {
          width: min(100vw - 20px, 1400px);
          padding-top: 14px;
        }
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="panel topbar">
        <div>
          <p class="eyebrow">Selected assets</p>
          <h1>${escapeHtml(title)} asset consumption demo</h1>
          <p class="lede">${escapeHtml(briefSummary)} The demo keeps project-local asset paths visible so HTML, React, and Tailwind work can wire generated images without guessing where they live.</p>
          <div class="chip-row" style="margin-top: 14px;">
            <span class="chip chip-green">Selected assets</span>
            <span class="chip chip-amber">Project-local asset paths</span>
            <span class="chip chip-neutral">Selection manifest</span>
            <span class="chip chip-neutral">Fallbacks ready</span>
          </div>
        </div>
        <div class="stack" style="min-width: 320px; max-width: 400px;">
          <div class="panel" style="padding: 14px;">
            <p class="metric-label">Prompt pack</p>
            <div class="metric-value">${manifest.assets.length}<small> prompt targets</small></div>
            <p class="section-subtitle">Use the first prompt target to compare visual directions, then wire the chosen assets into the app surface.</p>
          </div>
          <div class="panel" style="padding: 14px;">
            <p class="metric-label">Selection status</p>
            <div class="chip-row" style="margin-top: 6px;">
              ${selection.implementationTargets.map((target) => `<span class="chip ${target.status === 'ready' ? 'chip-green' : 'chip-amber'}">${escapeHtml(target.role)} ${escapeHtml(target.status)}</span>`).join('\n')}
            </div>
          </div>
        </div>
      </header>

      <section class="summary-grid" aria-label="Selection summary">
        <article class="panel metric">
          <div class="metric-label">Target roles</div>
          <div class="metric-value">${selection.implementationTargets.length}<small> selected surfaces</small></div>
          <div class="section-subtitle">Visual direction, hero, and empty-state slots stay separate on purpose.</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">Output path</div>
          <div class="metric-value">.tmp<small>/frontend-design-boost</small></div>
          <div class="section-subtitle">Selection and demo files stay next to the prompt pack for repeatable review.</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">Asset directory</div>
          <div class="metric-value">output<small>/imagegen/frontend-design-boost</small></div>
          <div class="section-subtitle">Use these project-local paths in HTML, React, or Tailwind code.</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">Fallbacks</div>
          <div class="metric-value">3<small> ready</small></div>
          <div class="section-subtitle">Each slot keeps readable copy and state chrome even before generation finishes.</div>
        </article>
      </section>

      <section class="content">
        <div class="stack">
          <section class="panel section">
            <div class="section-head">
              <div>
                <h2 class="section-title">Selected assets</h2>
                <p class="section-subtitle">A concrete bridge from the prompt pack to surfaces that consume project-bound bitmaps.</p>
              </div>
              <span class="chip chip-neutral">asset-consumption-demo.html</span>
            </div>
            <div class="asset-grid">
              ${assetCards}
            </div>
          </section>

          <section class="panel section">
            <div class="section-head">
              <div>
                <h2 class="section-title">How to use it</h2>
                <p class="section-subtitle">Treat the selected assets as inputs to implementation, not as a final visual spec.</p>
              </div>
            </div>
            <ol class="checklist">
              <li>Use the visual-direction asset to extract palette roles, spacing rhythm, and crop behavior.</li>
              <li>Place the hero asset in the first viewport only after copy, controls, and data density are confirmed.</li>
              <li>Use the empty-state asset for no-data and recoverable empty states, not as decoration.</li>
              <li>Keep the image paths project-local and wire them into HTML, React, or Tailwind components explicitly.</li>
              <li>Run screenshot QA after the chosen asset is wired into the real layout.</li>
            </ol>
          </section>
        </div>

        <div class="stack">
          <section class="panel section">
            <div class="section-head">
              <div>
                <h2 class="section-title">Path map</h2>
                <p class="section-subtitle">Reference the generated files directly instead of guessing at temp paths.</p>
              </div>
            </div>
            <ul class="path-list">
              ${pathMapRows}
            </ul>
          </section>

          <section class="panel section">
            <div class="section-head">
              <div>
                <h2 class="section-title">Implementation guardrails</h2>
                <p class="section-subtitle">The selected asset only helps if the code still owns layout, states, and accessibility.</p>
              </div>
            </div>
            <div class="note-row">
              <span class="chip chip-neutral">Keep controls visible</span>
              <span class="chip chip-neutral">Do not hide copy under art</span>
              <span class="chip chip-neutral">Maintain focus states</span>
              <span class="chip chip-neutral">Check mobile overflow</span>
            </div>
            <div class="footer" style="margin-top: 10px;">
              The demo is intentionally quiet so it can slot into HTML, React, and Tailwind tasks without forcing a new component library.
            </div>
          </section>
        </div>
      </section>
    </main>
    <script>
      document.querySelectorAll('[data-asset-slot]').forEach((card) => {
        const image = card.querySelector('img');
        if (!image) return;
        const markReady = () => { card.dataset.assetStatus = 'ready'; };
        const markMissing = () => { card.dataset.assetStatus = 'missing'; };
        if (image.complete && image.naturalWidth > 0) {
          markReady();
        } else {
          image.addEventListener('load', markReady, { once: true });
          image.addEventListener('error', markMissing, { once: true });
          if (!card.dataset.assetStatus || card.dataset.assetStatus === 'pending') {
            card.dataset.assetStatus = 'pending';
          }
        }
      });
    </script>
  </body>
</html>`;
};

const buildPrompt = ({ useCase, assetType, briefContext, referenceContext, primaryRequest, style, composition, constraints }) => [
  `Use case: ${useCase}`,
  `Asset type: ${assetType}`,
  briefContext,
  referenceContext,
  `Primary request: ${primaryRequest}`,
  `Style/medium: ${style}`,
  `Composition/framing: ${composition}`,
  `Constraints: ${constraints}`
].filter(Boolean).join('\n');

const buildCommandParts = ({ prompt, outPath, size, quality, dryRun = true }) => {
  const imageGenPath = '$CODEX_HOME/skills/.system/imagegen/scripts/image_gen.py';
  const parts = [
    'py',
    imageGenPath,
    'generate',
    '--prompt',
    prompt,
    '--model',
    'gpt-image-2',
    '--quality',
    quality,
    '--size',
    size,
    '--out',
    outPath
  ];
  if (dryRun) parts.push('--dry-run');
  return parts;
};

const quoteCommandPart = (part) => {
  const value = String(part);
  if (value.startsWith('$CODEX_HOME/')) return `"${value.replace(/"/g, '""')}"`;
  if (/^[A-Za-z0-9_./:$-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
};

const buildCommand = (options) => {
  const parts = buildCommandParts(options);
  return parts.map(quoteCommandPart).join(' ');
};

const buildGenerationJobs = ({ title, briefPath, referenceIntakePath, briefProfile, referenceProfile, manifest, assetSelectionPath, commandsPath, outDir }) => ({
  schema: 'frontend-design-boost-image-generation-jobs/v1',
  title,
  sourceBrief: outputRelative(path.resolve(briefPath)),
  sourceReferenceIntake: referenceIntakePath ? outputRelative(path.resolve(referenceIntakePath)) : '',
  model: manifest.model,
  transport: manifest.fallbackRoute?.transport ?? 'ccswitch',
  routeRole: 'cli-fallback',
  defaultRoute: manifest.defaultRoute,
  executionMode: 'approval-gated',
  environmentRequirements: manifest.fallbackRoute?.environmentRequirements ?? manifest.cliFallbackEnvironmentRequirements ?? [],
  generatedAt: new Date().toISOString(),
  briefProfile,
  referenceProfile,
  assetSelectionPath: outputRelative(assetSelectionPath),
  commandArtifactPath: outputRelative(commandsPath),
  selectionSource: manifest.assetSelectionPath,
  jobs: manifest.assets.map((asset) => ({
    id: asset.id,
    label: asset.label,
    useCase: asset.useCase,
    assetType: asset.assetType,
    status: 'ready_to_run',
    outputPath: asset.outputPath,
    projectPath: relativeFrom(outDir, path.resolve(root, asset.outputPath)),
    size: asset.size,
    quality: asset.quality,
    prompt: asset.prompt,
    commandParts: buildCommandParts({
      prompt: asset.prompt,
      outPath: asset.outputPath,
      size: asset.size,
      quality: asset.quality,
      dryRun: false
    }),
    command: buildCommand({
      prompt: asset.prompt,
      outPath: asset.outputPath,
      size: asset.size,
      quality: asset.quality,
      dryRun: false
    }),
    dryRunCommandParts: buildCommandParts({
      prompt: asset.prompt,
      outPath: asset.outputPath,
      size: asset.size,
      quality: asset.quality,
      dryRun: true
    }),
    dryRunCommand: buildCommand({
      prompt: asset.prompt,
      outPath: asset.outputPath,
      size: asset.size,
      quality: asset.quality,
      dryRun: true
    }),
    approvalGate: 'CLI fallback requires OPENAI_API_KEY or a verified ccswitch route; review asset-selection.json before running'
  }))
});

const buildImagegenHandoff = ({ title, manifest, assetSelection, handoffMarkdownPath }) => ({
  schema: 'frontend-design-boost-imagegen-handoff/v1',
  title,
  model: manifest.model,
  route: 'built-in image_gen through the Codex imagegen skill',
  executionMode: 'codex-built-in-imagegen-handoff',
  requiresOpenAiApiKey: false,
  sourcePromptPack: 'image-prompts.json',
  assetSelectionPath: manifest.assetSelectionPath,
  markdownPath: outputRelative(handoffMarkdownPath),
  sourceDefaultDirectory: 'CODEX_HOME/generated_images',
  instructions: [
    'Use the installed imagegen skill default built-in image_gen path for normal frontend visual direction and project assets.',
    'Generate each asset from its prompt, then move or copy the selected output from CODEX_HOME/generated_images into the listed project-local asset paths.',
    'Do not leave project-referenced assets only under CODEX_HOME/generated_images.',
    'After moving assets, run asset smoke, asset intake, image decision, and desktop and mobile screenshot QA.'
  ],
  assets: manifest.assets.map((asset) => {
    const target = assetSelection.implementationTargets.find((item) => item.assetId === asset.id) ?? {};
    return {
      id: asset.id,
      label: asset.label,
      useCase: asset.useCase,
      assetType: asset.assetType,
      slot: target.role ?? '',
      prompt: asset.prompt,
      size: asset.size,
      quality: asset.quality,
      finalAssetPath: asset.outputPath,
      generatedImagesSource: 'CODEX_HOME/generated_images',
      afterGeneration: [
        `Move or copy the chosen generated file to ${asset.outputPath}.`,
        'Run npm.cmd run smoke:frontend-design-boost:assets.',
        'Run npm.cmd run intake:frontend-design-boost:assets.',
        'Run npm.cmd run decision:frontend-design-boost:image.',
        'Run desktop and mobile screenshot QA after the asset is wired into UI code.'
      ]
    };
  })
});

const renderImagegenHandoffMarkdown = ({ handoff }) => [
  '# Frontend Design Boost Imagegen Handoff',
  '',
  `Route: ${handoff.route}`,
  `Execution mode: \`${handoff.executionMode}\``,
  `Model: \`${handoff.model}\``,
  '',
  'This built-in route does not require `OPENAI_API_KEY`. It uses the Codex `imagegen` skill default path, then moves accepted outputs into project-local asset paths.',
  '',
  '## Instructions',
  '',
  ...handoff.instructions.map((item) => `- ${item}`),
  '',
  '## Assets',
  '',
  ...handoff.assets.flatMap((asset) => [
    `### ${asset.id}`,
    '',
    `- Slot: ${asset.slot || 'visual reference'}`,
    `- Final asset path: \`${asset.finalAssetPath}\``,
    `- Built-in output source: \`${asset.generatedImagesSource}\``,
    `- Size target: ${asset.size}`,
    `- Quality target: ${asset.quality}`,
    '',
    'Prompt:',
    '',
    '```text',
    asset.prompt,
    '```',
    '',
    'After generation:',
    ...asset.afterGeneration.map((item) => `- ${item}`),
    ''
  ]),
  '## QA Gates',
  '',
  '- Asset smoke validates project-local PNG paths and dimensions.',
  '- Asset intake and image decision turn generated images into implementation guidance.',
  '- Desktop and mobile screenshot QA remain required after wiring assets into HTML, React, or Tailwind.',
  ''
].join('\n');

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n');

const renderAssetCard = (asset) => {
  const assetExists = existsSync(path.resolve(root, asset.outputPath));
  return `
        <article class="asset-card">
          <div class="asset-card-head">
            <div>
              <p class="asset-label">${escapeHtml(asset.label)}</p>
              <h3>${escapeHtml(asset.assetType)}</h3>
            </div>
            <span class="chip ${assetExists ? 'chip-green' : 'chip-amber'}">${assetExists ? 'generated' : 'pending'}</span>
          </div>
          <div class="asset-preview" aria-hidden="true">
            <div class="asset-preview-box">
              <span>${assetExists ? 'asset present' : 'preview pending'}</span>
              <span>${escapeHtml(asset.outputPath)}</span>
            </div>
          </div>
          <div class="asset-meta">
            <span class="chip chip-neutral">${escapeHtml(asset.size)}</span>
            <span class="chip chip-neutral">${escapeHtml(asset.quality)}</span>
            <span class="chip chip-neutral">${escapeHtml(asset.useCase)}</span>
          </div>
          <details>
            <summary>Prompt</summary>
            <pre>${escapeHtml(asset.prompt)}</pre>
          </details>
        </article>`;
};

const { briefPath, referenceIntakePath, outDir, assetOutDir } = parseArgs();
const resolvedBriefPath = path.resolve(briefPath);
const resolvedReferenceIntakePath = referenceIntakePath ? path.resolve(referenceIntakePath) : '';
const resolvedOutDir = path.resolve(outDir);
const resolvedAssetOutDir = path.resolve(assetOutDir);
const briefText = readBrief(resolvedBriefPath);
const referenceIntakeText = readReferenceIntake(resolvedReferenceIntakePath);
const title = extractTitle(briefText);
const briefProfile = buildBriefProfile({ text: briefText, title });
const briefContext = buildBriefContext(briefProfile);
const referenceProfile = buildReferenceProfile({
  text: referenceIntakeText,
  referenceIntakePath: resolvedReferenceIntakePath
});
const referenceContext = buildReferenceContext(referenceProfile);
const briefSummary = briefText
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !line.startsWith('#'))
  .slice(0, 6)
  .join(' ');

mkdirSync(resolvedOutDir, { recursive: true });

const assets = [
  {
    id: 'visual-direction-1',
    label: 'Visual Direction',
    useCase: 'productivity-visual',
    assetType: 'reference image',
    primaryRequest: `${title}: one clean visual direction for ${briefProfile.pageType || 'the frontend workflow'}`,
    style: 'clean modern dashboard illustration with restrained color and usable negative space',
    composition: 'wide composition, clear left-side copy space, detailed right-side visual cluster',
    constraints: ['no logos, no watermark, no fake UI text, no decorative blobs', briefProfile.avoid].filter(Boolean).join('; '),
    outputFile: path.join(resolvedAssetOutDir, 'visual-direction-1.png'),
    size: '1024x1024',
    quality: 'low'
  },
  {
    id: 'project-hero-asset',
    label: 'Project Assets',
    useCase: 'productivity-visual',
    assetType: 'project-bound hero bitmap asset',
    primaryRequest: `${title}: a product-ready hero asset for ${briefProfile.pageType || 'a frontend workflow page'}`,
    style: 'polished bitmap art with calm editorial contrast and product-grade clarity',
    composition: 'wide hero framing with safe copy area and no centered title text',
    constraints: ['no logos, no watermark, no fake metrics, no tiny text', briefProfile.visualRules].filter(Boolean).join('; '),
    outputFile: path.join(resolvedAssetOutDir, 'project-hero-asset.png'),
    size: '2048x1152',
    quality: 'medium'
  },
  {
    id: 'empty-state-asset',
    label: 'Project Assets',
    useCase: 'ui-mockup',
    assetType: 'empty-state illustration',
    primaryRequest: `${title}: a small empty-state bitmap asset that supports ${briefProfile.primaryAction || 'the design workflow'}`,
    style: 'simple bitmap illustration with soft contrast and broad shape language',
    composition: 'square or near-square framing with centered subject and generous padding',
    constraints: ['no logos, no watermark, no extra text, no UI chrome', briefProfile.interactionRules].filter(Boolean).join('; '),
    outputFile: path.join(resolvedAssetOutDir, 'empty-state-asset.png'),
    size: '1024x1024',
    quality: 'low'
  }
];

const extractionChecklist = [
  'Palette roles: background, surface, border, text, accent, warning, success, danger',
  'Surface rules: flat, raised, bordered, frosted, photographic, or editorial',
  'Radius and border rules',
  'Typography hierarchy and density',
  'Grid rhythm and first-viewport information hierarchy',
  'Visual asset placement and crop behavior',
  'Chart or data-display treatment, if relevant',
  'Interaction states that must still be built manually',
  'Anti-patterns to avoid from the generated result'
];

const qaChecklist = [
  'Desktop screenshot: 1440 x 900',
  'Mobile screenshot: 390 x 844',
  'No text overflow',
  'No overlapping controls or content',
  'Real assets load from project-local paths',
  'Interactive states are represented where relevant',
  'Tables, grids, charts, and panels remain usable on mobile',
  'Generated images do not obscure primary copy or controls'
];

const manifestPath = path.join(resolvedOutDir, 'image-prompts.json');
const assetSelectionPath = path.join(resolvedOutDir, 'asset-selection.json');
const assetConsumptionDemoPath = path.join(resolvedOutDir, 'asset-consumption-demo.html');
const readmePath = path.join(resolvedOutDir, 'README.md');
const previewPath = path.join(resolvedOutDir, 'preview.html');
const commandsPath = path.join(resolvedOutDir, 'imagegen-commands.ps1');
const generationJobsPath = path.join(resolvedOutDir, 'image-generation-jobs.json');
const imagegenHandoffPath = path.join(resolvedOutDir, 'imagegen-handoff.json');
const imagegenHandoffMarkdownPath = path.join(resolvedOutDir, 'imagegen-handoff.md');

const manifest = {
  schema: 'frontend-design-boost-image-prompt-pack/v1',
  title,
  sourceBrief: outputRelative(resolvedBriefPath),
  sourceReferenceIntake: resolvedReferenceIntakePath ? outputRelative(resolvedReferenceIntakePath) : '',
  assetSelectionPath: outputRelative(assetSelectionPath),
  assetConsumptionDemoPath: outputRelative(assetConsumptionDemoPath),
  generationJobsPath: outputRelative(generationJobsPath),
  imagegenHandoffPath: outputRelative(imagegenHandoffPath),
  imagegenHandoffMarkdownPath: outputRelative(imagegenHandoffMarkdownPath),
  model: 'gpt-image-2',
  transport: 'built-in-imagegen',
  defaultRoute: {
    transport: 'built-in-imagegen',
    route: 'built-in image_gen through the Codex imagegen skill',
    executionMode: 'codex-built-in-imagegen-handoff',
    requiresOpenAiApiKey: false,
    sourceDefaultDirectory: 'CODEX_HOME/generated_images'
  },
  fallbackRoute: {
    transport: 'ccswitch',
    route: 'CLI fallback through image_gen.py',
    executionMode: 'approval-gated-cli-fallback',
    environmentRequirements: ['OPENAI_API_KEY']
  },
  environmentRequirements: [],
  cliFallbackEnvironmentRequirements: ['OPENAI_API_KEY'],
  generatedAt: new Date().toISOString(),
  briefSummary,
  briefProfile,
  referenceProfile,
  sections: {
    'Extraction Checklist': extractionChecklist,
    'Screenshot QA': qaChecklist
  },
  assets: assets.map((asset) => ({
    id: asset.id,
    label: asset.label,
      useCase: asset.useCase,
      assetType: asset.assetType,
      prompt: buildPrompt({
        useCase: asset.useCase,
        assetType: asset.assetType,
        briefContext,
        referenceContext,
        primaryRequest: asset.primaryRequest,
        style: asset.style,
        composition: asset.composition,
      constraints: asset.constraints
    }),
    outputPath: outputRelative(asset.outputFile),
    size: asset.size,
    quality: asset.quality
  })),
  extractionChecklist,
  screenshotQAGuide: qaChecklist
};

const generationJobs = buildGenerationJobs({
  title,
  briefPath: resolvedBriefPath,
  referenceIntakePath: resolvedReferenceIntakePath,
  briefProfile,
  referenceProfile,
  manifest,
  assetSelectionPath,
  commandsPath,
  outDir: resolvedOutDir
});

const assetSelection = buildAssetSelection({
  title,
  briefPath: resolvedBriefPath,
  briefProfile,
  briefSummary,
  referenceProfile,
  outDir: resolvedOutDir,
  assetOutDir: resolvedAssetOutDir,
  assets
});

const assetConsumptionDemo = renderAssetConsumptionDemo({
  title,
  briefSummary,
  selection: assetSelection,
  manifest,
  outDir: resolvedOutDir
});

const imagegenHandoff = buildImagegenHandoff({
  title,
  manifest,
  assetSelection,
  handoffMarkdownPath: imagegenHandoffMarkdownPath
});
const imagegenHandoffMarkdown = renderImagegenHandoffMarkdown({ handoff: imagegenHandoff });

const readme = [
  `# ${title}`,
  '',
  'This prompt pack converts a frontend brief into gpt-image-2-ready prompts, output paths, and QA notes.',
  '',
  `Source brief: \`${outputRelative(resolvedBriefPath)}\``,
  `Reference intake: \`${referenceProfile.enabled ? referenceProfile.source : 'not supplied'}\``,
  `Output directory: \`${outputRelative(resolvedOutDir)}\``,
  `Asset output directory: \`${outputRelative(resolvedAssetOutDir)}\``,
  `Asset selection manifest: \`${outputRelative(assetSelectionPath)}\``,
  `Asset consumption demo: \`${outputRelative(assetConsumptionDemoPath)}\``,
  `Image generation jobs: \`${outputRelative(generationJobsPath)}\``,
  `Built-in imagegen handoff: \`${outputRelative(imagegenHandoffPath)}\``,
  '',
  '## Workflow',
  '',
  '1. Review the brief.',
  '2. Review optional reference intake before trusting any generated visual direction.',
  '3. Pick a visual direction asset.',
  '4. Generate or inspect the project-bound bitmap assets.',
  '5. Review `asset-selection.json` and `asset-consumption-demo.html` to map images into actual UI slots.',
  '6. Extract tokens and layout decisions.',
  '7. Implement the UI.',
  '8. Run screenshot QA.',
  '',
  '## Generated Assets',
  '',
  ...manifest.assets.map((asset) => `- ${asset.label}: \`${asset.outputPath}\``),
  '',
  '## Asset Selection',
  '',
  '- `asset-selection.json` records the selected visual-direction, hero, and empty-state roles.',
  '- `asset-consumption-demo.html` shows how the project-local asset paths should degrade when images are missing.',
  '- `imagegen-handoff.json` records the default built-in image_gen prompts and project-local asset destinations without requiring `OPENAI_API_KEY`.',
  '- `image-generation-jobs.json` records the optional approval-gated CLI fallback that still needs `OPENAI_API_KEY` or a verified ccswitch route.',
  '',
  '## Commands',
  '',
  '- Rebuild this pack with `npm.cmd run lab:frontend-design-boost:image`.',
  '- Pass selected external reference notes with `--reference-intake <path>`.',
  '- Dry-run prompt inspection uses the generated PowerShell snippets.',
  '- Default generation uses the installed `imagegen` skill built-in route, then moves accepted outputs from `CODEX_HOME/generated_images` into project-local asset paths.',
  '- CLI fallback generation requires the local `OPENAI_API_KEY` or ccswitch-backed image path.',
  '',
  '## Acceptance Gate',
  '',
  '- Prompt pack is deterministic and checked in through tests.',
  '- Generated asset paths stay project-local.',
  '- Screenshot QA still runs at 1440x900 and 390x844.',
  '- The asset output must be reviewed before being trusted as implementation truth.'
].join('\n');

const commands = [
  '$env:CODEX_HOME = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }',
  '$IMAGE_GEN = Join-Path $env:CODEX_HOME "skills/.system/imagegen/scripts/image_gen.py"',
  '',
  '# Visual direction draft',
  buildCommand({
    prompt: manifest.assets[0].prompt,
    outPath: manifest.assets[0].outputPath,
    size: manifest.assets[0].size,
    quality: manifest.assets[0].quality
  }),
  '',
  '# Project hero asset',
  buildCommand({
    prompt: manifest.assets[1].prompt,
    outPath: manifest.assets[1].outputPath,
    size: manifest.assets[1].size,
    quality: manifest.assets[1].quality
  }),
  '',
  '# Empty-state asset',
  buildCommand({
    prompt: manifest.assets[2].prompt,
    outPath: manifest.assets[2].outputPath,
    size: manifest.assets[2].size,
    quality: manifest.assets[2].quality
  })
].join('\n');

const previewHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} Preview</title>
    <style>
      :root {
        --bg: #0d1117;
        --panel: #121826;
        --panel-2: #0f1522;
        --line: #253049;
        --text: #e6edf3;
        --muted: #93a4bc;
        --accent: #7dd3fc;
        --good: #2fdf84;
        --warn: #fbbf24;
        --radius: 8px;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: Inter, Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
      body { line-height: 1.45; }
      .page { max-width: 1440px; margin: 0 auto; padding: 24px; }
      .topbar {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
        align-items: start;
        margin-bottom: 20px;
      }
      .eyebrow { margin: 0 0 8px; color: var(--accent); text-transform: uppercase; letter-spacing: 0; font-size: 12px; }
      h1, h2, h3, p { margin: 0; }
      h1 { font-size: 32px; line-height: 1.1; margin-bottom: 10px; }
      .lede { color: var(--muted); max-width: 72ch; }
      .status-row, .chip-row, .meta-row, .asset-meta, .command-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .panel {
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid var(--line);
        border-radius: var(--radius);
        padding: 16px;
      }
      .summary-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 20px;
      }
      .metric { min-height: 110px; }
      .metric-label, .asset-label, .section-subtitle, .command-subtitle, .callout { color: var(--muted); }
      .metric-value { font-size: 26px; margin: 8px 0; }
      .metric-value small { font-size: 13px; color: var(--muted); }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.03);
        color: var(--text);
        font-size: 12px;
        white-space: nowrap;
      }
      .chip-green { border-color: rgba(47,223,132,0.35); color: #b7f7d1; }
      .chip-amber { border-color: rgba(251,191,36,0.35); color: #fde68a; }
      .chip-neutral { color: var(--muted); }
      .shell {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.65fr) minmax(340px, 0.95fr);
        align-items: start;
      }
      .stack { display: grid; gap: 16px; }
      .section { display: grid; gap: 14px; }
      .section-header { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
      .section-title { font-size: 18px; margin-bottom: 4px; }
      .panel-list { display: grid; gap: 12px; }
      .asset-card {
        display: grid;
        gap: 12px;
        padding: 14px;
        border-radius: var(--radius);
        border: 1px solid var(--line);
        background: var(--panel-2);
      }
      .asset-card-head { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
      .asset-preview {
        min-height: 130px;
        border-radius: var(--radius);
        border: 1px dashed rgba(125,211,252,0.35);
        background:
          linear-gradient(135deg, rgba(125,211,252,0.14), rgba(15,21,34,0.85)),
          repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 8px, rgba(255,255,255,0.01) 8px 16px);
        display: grid;
        place-items: center;
      }
      .asset-preview-box {
        display: grid;
        gap: 8px;
        text-align: center;
        max-width: 90%;
        color: var(--text);
        font-size: 13px;
      }
      details {
        border-top: 1px solid var(--line);
        padding-top: 10px;
      }
      summary {
        cursor: pointer;
        color: var(--accent);
        list-style: none;
        outline: none;
      }
      summary::-webkit-details-marker { display: none; }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 10px 0 0;
        padding: 12px;
        border-radius: var(--radius);
        background: rgba(0,0,0,0.25);
        border: 1px solid var(--line);
        color: #d7e3f4;
        font-size: 12px;
      }
      .checklist {
        margin: 0;
        padding-left: 18px;
        color: #d7e3f4;
      }
      .checklist li + li { margin-top: 8px; }
      .command-panel { display: grid; gap: 12px; }
      .callout-box {
        border-radius: var(--radius);
        border: 1px solid rgba(125,211,252,0.22);
        background: rgba(125,211,252,0.08);
        padding: 12px;
        color: #d7e3f4;
      }
      .command-block {
        display: grid;
        gap: 10px;
        padding: 12px;
        border-radius: var(--radius);
        border: 1px solid var(--line);
        background: rgba(0,0,0,0.2);
      }
      .footer-note { color: var(--muted); font-size: 12px; }
      @media (max-width: 1100px) {
        .topbar, .shell { grid-template-columns: 1fr; }
        .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 720px) {
        .page { padding: 16px; }
        h1 { font-size: 28px; }
        .summary-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="topbar">
        <div class="panel">
          <p class="eyebrow">Image assisted frontend workflow</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="lede">${escapeHtml(briefSummary)}</p>
          <div class="status-row" style="margin-top: 14px;">
            <span class="chip chip-green">Prompt pack ready</span>
            <span class="chip chip-amber">Assets pending generation</span>
            <span class="chip chip-neutral">Model: gpt-image-2</span>
            <span class="chip chip-neutral">Default: built-in imagegen</span>
            <span class="chip chip-neutral">CLI fallback: ccswitch</span>
          </div>
        </div>
        <div class="panel command-panel">
          <div>
            <p class="eyebrow">Workflow status</p>
            <div class="chip-row">
              <span class="chip chip-neutral">Built-in route: no OPENAI_API_KEY</span>
              <span class="chip chip-neutral">CLI fallback: OPENAI_API_KEY</span>
              <span class="chip chip-neutral">Project-local outputs</span>
              <span class="chip chip-neutral">Screenshot QA ready</span>
            </div>
          </div>
          <div class="callout-box">
            Use this preview to compare prompt packs, check output paths, and review extraction notes before generating final assets.
          </div>
          <div class="command-row">
            <button type="button" class="chip">Rebuild pack</button>
            <button type="button" class="chip">Run QA</button>
            <button type="button" class="chip">Inspect assets</button>
          </div>
        </div>
      </header>

      <section class="summary-grid" aria-label="Summary metrics">
        <article class="panel metric">
          <div class="metric-label">Visual directions</div>
          <div class="metric-value">${manifest.assets.length}<small> prompt targets</small></div>
          <div class="footer-note">Use the first asset to explore overall tone.</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">Extraction items</div>
          <div class="metric-value">${extractionChecklist.length}<small> design cues</small></div>
          <div class="footer-note">Turn the chosen image into tokens and layout decisions.</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">QA checks</div>
          <div class="metric-value">${qaChecklist.length}<small> screen gates</small></div>
          <div class="footer-note">Desktop and mobile review remain mandatory.</div>
        </article>
        <article class="panel metric">
          <div class="metric-label">Artifact target</div>
          <div class="metric-value">.tmp<small>/frontend-design-boost</small></div>
          <div class="footer-note">Keep generated assets project-local before wiring them into UI code.</div>
        </article>
      </section>

      <section class="panel section" aria-label="Reference intake">
        <div class="section-header">
          <div>
            <h2 class="section-title">Reference intake</h2>
            <p class="section-subtitle">${referenceProfile.enabled ? 'Selected external sources are included as prompt-shaping guidance only.' : 'No external reference intake was supplied for this prompt pack.'}</p>
          </div>
          <span class="chip ${referenceProfile.enabled ? 'chip-green' : 'chip-neutral'}">${referenceProfile.enabled ? 'Included' : 'Not supplied'}</span>
        </div>
        <div class="callout-box">
          <div>${escapeHtml(referenceProfile.enabled ? (referenceProfile.selectedSources || referenceProfile.sourceFamily || referenceProfile.source) : 'Use --reference-intake <path> after selecting source-backed references from the local shortlist.')}</div>
          ${referenceProfile.enabled && referenceProfile.extract ? `<div style="margin-top: 8px;"><strong>Extract:</strong> ${escapeHtml(referenceProfile.extract)}</div>` : ''}
          ${referenceProfile.enabled && referenceProfile.avoid ? `<div class="footer-note" style="margin-top: 8px;"><strong>Do not copy:</strong> ${escapeHtml(referenceProfile.avoid)}</div>` : ''}
        </div>
      </section>

      <section class="panel section" aria-label="Generation jobs">
        <div class="section-header">
          <div>
            <h2 class="section-title">Generation jobs</h2>
            <p class="section-subtitle">Machine-readable gpt-image-2 job manifest for running or auditing the selected prompt targets.</p>
          </div>
          <span class="chip chip-neutral">${generationJobs.jobs.length} jobs</span>
        </div>
        <div class="callout-box">
          <div>${escapeHtml(outputRelative(generationJobsPath))}</div>
          <div class="footer-note" style="margin-top: 8px;">Mode: ${escapeHtml(generationJobs.executionMode)}; run only after the image route and asset-selection review are approved.</div>
        </div>
      </section>

      <section class="panel section" aria-label="Built-in imagegen handoff">
        <div class="section-header">
          <div>
            <h2 class="section-title">Built-in imagegen handoff</h2>
            <p class="section-subtitle">Default Codex imagegen route prompts, asset destinations, and post-generation QA gates.</p>
          </div>
          <span class="chip chip-green">No API key required</span>
        </div>
        <div class="callout-box">
          <div>${escapeHtml(outputRelative(imagegenHandoffPath))}</div>
          <div class="footer-note" style="margin-top: 8px;">Move selected outputs from CODEX_HOME/generated_images into project-local asset paths, then run asset smoke and screenshot QA.</div>
        </div>
      </section>

      <section class="shell">
        <div class="stack">
          <section class="panel section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Prompt pack</h2>
                <p class="section-subtitle">Three concrete prompts to turn the brief into gpt-image-2-ready assets.</p>
              </div>
              <span class="chip chip-neutral">${escapeHtml(manifest.model)}</span>
            </div>
            <div class="panel-list">
              ${manifest.assets.map(renderAssetCard).join('\n')}
            </div>
          </section>

          <section class="panel section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Command notes</h2>
                <p class="section-subtitle">The generated prompt pack includes the exact commands to repeat the workflow.</p>
              </div>
              <span class="chip chip-neutral">Repeatable</span>
            </div>
            <div class="command-block">
              <pre>${escapeHtml(commands)}</pre>
            </div>
          </section>
        </div>

        <div class="stack">
          <section class="panel section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Extraction checklist</h2>
                <p class="section-subtitle">What to pull out of the chosen reference before coding.</p>
              </div>
            </div>
            <ol class="checklist">
              ${renderList(extractionChecklist)}
            </ol>
          </section>

          <section class="panel section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Screenshot QA</h2>
                <p class="section-subtitle">Use the same viewport gates you already trust for frontend work.</p>
              </div>
            </div>
            <ol class="checklist">
              ${renderList(qaChecklist)}
            </ol>
          </section>

          <section class="panel section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Source brief</h2>
                <p class="section-subtitle">Generated from the checked-in brief fixture.</p>
              </div>
            </div>
            <div class="callout-box">
              <div>${escapeHtml(outputRelative(resolvedBriefPath))}</div>
              <div style="margin-top: 8px;">Selection demo: <span class="footer-note">${escapeHtml(outputRelative(assetConsumptionDemoPath))}</span></div>
              <div class="footer-note" style="margin-top: 8px;">Re-run the lab after brief edits to keep the prompt pack aligned.</div>
            </div>
          </section>
        </div>
      </section>
    </main>
  </body>
</html>`;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
writeFileSync(generationJobsPath, `${JSON.stringify(generationJobs, null, 2)}\n`, 'utf8');
writeFileSync(imagegenHandoffPath, `${JSON.stringify(imagegenHandoff, null, 2)}\n`, 'utf8');
writeFileSync(imagegenHandoffMarkdownPath, `${imagegenHandoffMarkdown}\n`, 'utf8');
writeFileSync(assetSelectionPath, `${JSON.stringify(assetSelection, null, 2)}\n`, 'utf8');
writeFileSync(readmePath, `${readme}\n`, 'utf8');
writeFileSync(previewPath, `${previewHtml}\n`, 'utf8');
writeFileSync(assetConsumptionDemoPath, `${assetConsumptionDemo}\n`, 'utf8');
writeFileSync(commandsPath, `${commands}\n`, 'utf8');

process.stdout.write(JSON.stringify({
  ok: true,
  title,
  outDir: outputRelative(resolvedOutDir),
  selection: outputRelative(assetSelectionPath),
  consumptionDemo: outputRelative(assetConsumptionDemoPath),
  generationJobs: outputRelative(generationJobsPath),
  imagegenHandoff: outputRelative(imagegenHandoffPath),
  assets: manifest.assets.map((asset) => asset.outputPath)
}, null, 2));
process.stdout.write('\n');
