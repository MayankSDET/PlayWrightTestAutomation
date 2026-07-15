import * as fs from 'fs';
import * as path from 'path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

type Row = { title: string; passed: boolean; blocked: string | null };
type Section = { key: string; label: string; blurb: string; tests: Row[] };

const SECTION_META: Record<string, { label: string; blurb: string }> = {
  ui: {
    label: 'Shopping Website',
    blurb: 'Can a customer log in, browse and sort products, use the cart, and complete checkout on saucedemo.com?',
  },
  database: {
    label: 'Database Records',
    blurb: 'Can the system create, read, update, and delete a customer record correctly?',
  },
  'api-object': {
    label: 'External Service — Product Catalog API',
    blurb: 'Can the app create, read, update, and delete a product record on the external catalog service?',
  },
  'api-user': {
    label: 'External Service — Accounts & Login API',
    blurb: 'Can the app look up users and handle account registration/login on the external accounts service?',
  },
  aws: {
    label: 'Cloud File Storage — Amazon (AWS)',
    blurb: "Can the app find and read files stored in Amazon's cloud storage?",
  },
  azure: {
    label: 'Cloud File Storage — Microsoft (Azure)',
    blurb: "Can the app find and read files stored in Microsoft's cloud storage?",
  },
};

const SECTION_ORDER = ['ui', 'database', 'api-object', 'api-user', 'aws', 'azure'];

function sectionKeyFor(file: string): string | null {
  if (file.startsWith('ui/tests')) return 'ui';
  if (file.startsWith('database/tests')) return 'database';
  if (file === 'api/tests/api-object.spec.ts') return 'api-object';
  if (file === 'api/tests/reqres-user.spec.ts') return 'api-user';
  if (file.startsWith('aws/tests')) return 'aws';
  if (file.startsWith('azure/tests')) return 'azure';
  return null;
}

function blockedReason(file: string): string | null {
  if (file.startsWith('aws/')) {
    return 'Needs setup — a real Amazon (AWS) account must be connected. Currently using a placeholder key.';
  }
  if (file.startsWith('azure/')) {
    return 'Needs setup — a real Microsoft (Azure) storage account must be connected. Currently using a placeholder key.';
  }
  if (file === 'api/tests/reqres-user.spec.ts') {
    return 'Needs setup — a real access key for the accounts service is required. Currently using a placeholder key.';
  }
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default class FriendlyReporter implements Reporter {
  private readonly outputFile: string;
  private readonly bySection = new Map<string, Section>();
  private startedAt = 0;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? 'friendly-report/index.html';
  }

  onBegin(): void {
    this.startedAt = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const file = path.relative(process.cwd(), test.location.file).split(path.sep).join('/');
    const key = sectionKeyFor(file);
    if (!key) {
      return;
    }
    if (!this.bySection.has(key)) {
      this.bySection.set(key, { key, ...SECTION_META[key], tests: [] });
    }
    const passed = result.status === 'passed';
    this.bySection.get(key)!.tests.push({
      title: test.title,
      passed,
      blocked: passed ? null : blockedReason(file),
    });
  }

  onEnd(result: FullResult): void {
    const sections = SECTION_ORDER.map((key) => this.bySection.get(key)).filter((s): s is Section => Boolean(s));
    const durationMs = Date.now() - this.startedAt;
    const html = renderReport(sections, durationMs, result.status);

    const outPath = path.resolve(process.cwd(), this.outputFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html);
  }

  printsToStdio(): boolean {
    return false;
  }
}

function renderReport(sections: Section[], durationMs: number, overallStatus: FullResult['status']): string {
  const allTests = sections.flatMap((s) => s.tests);
  const total = allTests.length;
  const passedCount = allTests.filter((t) => t.passed).length;
  const blockedCount = allTests.filter((t) => !t.passed && t.blocked).length;
  const bugCount = allTests.filter((t) => !t.passed && !t.blocked).length;
  const passedPct = total ? (passedCount / total) * 100 : 0;
  const blockedPct = total ? (blockedCount / total) * 100 : 0;
  const bugPct = total ? (bugCount / total) * 100 : 0;
  const seconds = (durationMs / 1000).toFixed(1);
  const runDate = new Date().toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const sectionsHtml = sections
    .map((section) => {
      const sectionPassed = section.tests.filter((t) => t.passed).length;
      const rows = section.tests
        .map((t) => {
          const state = t.passed ? 'pass' : t.blocked ? 'blocked' : 'bug';
          const stateLabel = t.passed ? 'Passing' : t.blocked ? 'Needs setup' : 'Problem found';
          const explanation = !t.passed
            ? `<p class="row-note">${escapeHtml(t.blocked ?? 'Needs investigation — this check did not behave as expected.')}</p>`
            : '';
          return `
        <li class="row row--${state}">
          <span class="row-marker" aria-hidden="true"></span>
          <div class="row-body">
            <div class="row-title-line">
              <span class="row-title">${escapeHtml(t.title)}</span>
              <span class="row-chip row-chip--${state}">${stateLabel}</span>
            </div>
            ${explanation}
          </div>
        </li>`;
        })
        .join('');

      return `
      <section class="card">
        <header class="card-header">
          <h2>${escapeHtml(section.label)}</h2>
          <span class="card-tally">${sectionPassed}/${section.tests.length}</span>
        </header>
        <p class="card-blurb">${escapeHtml(section.blurb)}</p>
        <ul class="row-list">${rows}</ul>
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>QA Status Report</title>
<style>
  :root {
    --bg: #f5f6f3;
    --surface: #ffffff;
    --border: #dce0da;
    --ink: #1e2422;
    --ink-muted: #5b6560;
    --accent: #2c4a6e;
    --pass: #2f7d5d;
    --pass-bg: rgba(47, 125, 93, 0.09);
    --blocked: #a8681f;
    --blocked-bg: rgba(184, 121, 46, 0.1);
    --bug: #b03434;
    --bug-bg: rgba(196, 61, 61, 0.09);
  }
  :root[data-theme="dark"] {
    --bg: #14181a;
    --surface: #1c2224;
    --border: #2a3234;
    --ink: #e7ece8;
    --ink-muted: #9ba8a2;
    --accent: #8db2d6;
    --pass: #5fbd8f;
    --pass-bg: rgba(95, 189, 143, 0.14);
    --blocked: #e0a252;
    --blocked-bg: rgba(224, 162, 82, 0.14);
    --bug: #e8746c;
    --bug-bg: rgba(232, 116, 108, 0.14);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #14181a;
      --surface: #1c2224;
      --border: #2a3234;
      --ink: #e7ece8;
      --ink-muted: #9ba8a2;
      --accent: #8db2d6;
      --pass: #5fbd8f;
      --pass-bg: rgba(95, 189, 143, 0.14);
      --blocked: #e0a252;
      --blocked-bg: rgba(224, 162, 82, 0.14);
      --bug: #e8746c;
      --bug-bg: rgba(232, 116, 108, 0.14);
    }
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.5;
  }
  .page {
    max-width: 760px;
    margin: 0 auto;
    padding: 56px 24px 96px;
  }
  .eyebrow {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 10px;
  }
  h1 {
    font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
    font-size: clamp(28px, 4vw, 38px);
    font-weight: 600;
    margin: 0 0 8px;
    text-wrap: balance;
    color: var(--ink);
  }
  .meta {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
    font-size: 13px;
    margin: 0 0 36px;
  }

  .summary {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 24px 28px;
    margin-bottom: 40px;
  }
  .summary-count {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 16px;
  }
  .summary-count .num {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 40px;
    font-weight: 600;
    color: var(--ink);
  }
  .summary-count .of {
    font-size: 15px;
    color: var(--ink-muted);
  }
  .bar {
    display: flex;
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
    background: var(--border);
    margin-bottom: 18px;
  }
  .bar-seg--pass { background: var(--pass); }
  .bar-seg--blocked { background: var(--blocked); }
  .bar-seg--bug { background: var(--bug); }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    font-size: 13px;
    color: var(--ink-muted);
  }
  .legend-item { display: flex; align-items: center; gap: 7px; }
  .legend-dot { width: 9px; height: 9px; border-radius: 2px; flex: none; }
  .legend-dot--pass { background: var(--pass); }
  .legend-dot--blocked { background: var(--blocked); }
  .legend-dot--bug { background: var(--bug); }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 24px 28px 8px;
    margin-bottom: 24px;
  }
  .card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }
  .card-header h2 {
    font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    text-wrap: balance;
  }
  .card-tally {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    color: var(--ink-muted);
    flex: none;
  }
  .card-blurb {
    color: var(--ink-muted);
    font-size: 14px;
    margin: 6px 0 18px;
    max-width: 62ch;
  }

  .row-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--border);
  }
  .row {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .row-marker {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-top: 6px;
    flex: none;
  }
  .row--pass .row-marker { background: var(--pass); }
  .row--blocked .row-marker { background: var(--blocked); }
  .row--bug .row-marker { background: var(--bug); }

  .row-body { flex: 1; min-width: 0; }
  .row-title-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .row-title { font-size: 14.5px; }
  .row-chip {
    flex: none;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 2px 8px;
    border-radius: 100px;
  }
  .row-chip--pass { color: var(--pass); background: var(--pass-bg); }
  .row-chip--blocked { color: var(--blocked); background: var(--blocked-bg); }
  .row-chip--bug { color: var(--bug); background: var(--bug-bg); }
  .row-note {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--ink-muted);
  }

  footer {
    margin-top: 40px;
    font-size: 12.5px;
    color: var(--ink-muted);
  }
  footer a { color: var(--accent); }
</style>
</head>
<body>
  <div class="page">
    <p class="eyebrow">QA Status Report</p>
    <h1>Is the app working right now?</h1>
    <p class="meta">Run on ${escapeHtml(runDate)} · ${seconds}s · overall: ${escapeHtml(overallStatus)}</p>

    <div class="summary">
      <div class="summary-count">
        <span class="num">${passedCount}</span>
        <span class="of">of ${total} checks passing</span>
      </div>
      <div class="bar">
        ${passedPct > 0 ? `<div class="bar-seg bar-seg--pass" style="width:${passedPct}%"></div>` : ''}
        ${blockedPct > 0 ? `<div class="bar-seg bar-seg--blocked" style="width:${blockedPct}%"></div>` : ''}
        ${bugPct > 0 ? `<div class="bar-seg bar-seg--bug" style="width:${bugPct}%"></div>` : ''}
      </div>
      <div class="legend">
        <span class="legend-item"><span class="legend-dot legend-dot--pass"></span>Passing — working as expected</span>
        <span class="legend-item"><span class="legend-dot legend-dot--blocked"></span>Needs setup — not a bug, just missing a real account/key</span>
        <span class="legend-item"><span class="legend-dot legend-dot--bug"></span>Problem found — needs a developer to look</span>
      </div>
    </div>

    ${sectionsHtml}

    <footer>
      Generated automatically from the Playwright test run. For the full technical report (stack traces, screenshots), run <code>npm run report</code>.
    </footer>
  </div>
</body>
</html>`;
}
