import * as fs from 'fs';
import * as path from 'path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { blockedReason, escapeHtml } from './testClassification';

type ComponentMeta = { component: string; domain: string; description: string };

// One entry per fixture in fixtures/base.fixture.ts that wraps a real framework
// component (a page object, service, or API client). Fixtures that just hand back
// Playwright's own `page`, or worker-scoped plumbing no spec destructures directly
// (apiRequestContext, reqresRequestContext, dbService), are deliberately absent —
// they aren't a component this framework built. Several fixtures map to the same
// `component` on purpose (e.g. authenticatedInventoryPage + inventoryPage both
// exercise InventoryPage) so their test counts merge into one card.
const COMPONENT_META: Record<string, ComponentMeta> = {
  loginPage: { component: 'LoginPage', domain: 'ui', description: 'Login screen for saucedemo.com' },
  inventoryPage: { component: 'InventoryPage', domain: 'ui', description: 'Product listing, sorting, and the cart badge' },
  authenticatedInventoryPage: { component: 'InventoryPage', domain: 'ui', description: 'Product listing, sorting, and the cart badge' },
  cartPage: { component: 'CartPage', domain: 'ui', description: 'Shopping cart screen' },
  checkoutStepOnePage: { component: 'CheckoutStepOnePage', domain: 'ui', description: 'Checkout: customer information' },
  checkoutStepTwoPage: { component: 'CheckoutStepTwoPage', domain: 'ui', description: 'Checkout: order overview & totals' },
  checkoutCompletePage: { component: 'CheckoutCompletePage', domain: 'ui', description: 'Checkout: order confirmation' },
  performanceService: { component: 'PerformanceService', domain: 'performance', description: 'Navigation timing & Core Web Vitals reader' },
  userRepository: { component: 'UserRepository', domain: 'database', description: 'SQLite users table queries' },
  objectApiClient: { component: 'ObjectApiClient', domain: 'api', description: 'REST client for api.restful-api.dev objects' },
  userApiClient: { component: 'UserApiClient', domain: 'api', description: 'REST client for reqres.in users & auth' },
  s3Service: { component: 'S3Service', domain: 'aws', description: 'AWS S3 file operations' },
  lambdaService: { component: 'LambdaService', domain: 'aws', description: 'AWS Lambda function operations' },
  vpcService: { component: 'VpcService', domain: 'aws', description: 'AWS VPC & subnet reads' },
  route53Service: { component: 'Route53Service', domain: 'aws', description: 'AWS Route 53 DNS operations' },
  blobService: { component: 'BlobService', domain: 'azure', description: 'Azure Blob Storage file operations' },
  vnetService: { component: 'VNetService', domain: 'azure', description: 'Azure VNet & subnet reads' },
  dnsService: { component: 'DnsService', domain: 'azure', description: 'Azure DNS zone & record operations' },
  functionsService: { component: 'FunctionsService', domain: 'azure', description: 'Azure Functions app operations' },
};

const DOMAIN_ORDER = ['ui', 'performance', 'database', 'api', 'aws', 'azure'];
const DOMAIN_LABELS: Record<string, string> = {
  ui: 'UI — saucedemo.com',
  performance: 'Performance',
  database: 'Database',
  api: 'API clients',
  aws: 'AWS',
  azure: 'Azure',
};

type TestRow = { title: string; specFile: string; passed: boolean; blocked: string | null };
type ComponentSection = { component: string; domain: string; description: string; tests: TestRow[] };
type Status = 'good' | 'warning' | 'critical' | 'untested';

// Reads each spec's own source to find which fixtures a test destructures — e.g.
// `async ({ lambdaService }) => {` — instead of hardcoding a file-to-component map that
// would need updating by hand every time a spec changes which fixtures it uses.
const fileLinesCache = new Map<string, string[]>();

function getLines(filePath: string): string[] {
  let lines = fileLinesCache.get(filePath);
  if (!lines) {
    lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    fileLinesCache.set(filePath, lines);
  }
  return lines;
}

function extractFixtureNames(filePath: string, line: number): string[] {
  const lines = getLines(filePath);
  const windowText = lines.slice(Math.max(0, line - 1), line + 19).join('\n');
  const match = windowText.match(/async\s*\(\s*\{([\s\S]*?)\}\s*\)\s*=>/);
  if (!match) {
    return [];
  }
  return match[1]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(':')[0].trim());
}

function statusOf(tests: TestRow[]): Status {
  if (tests.length === 0) return 'untested';
  if (tests.some((t) => !t.passed && !t.blocked)) return 'critical';
  if (tests.some((t) => !t.passed && t.blocked)) return 'warning';
  return 'good';
}

const STATUS_ICON: Record<Status, string> = { good: '✓', warning: '⚠', critical: '✕', untested: '–' };
const STATUS_LABEL: Record<Status, string> = {
  good: 'All passing',
  warning: 'Needs setup',
  critical: 'Has a problem',
  untested: 'Not covered yet',
};

export default class ComponentDashboardReporter implements Reporter {
  private readonly outputFile: string;
  private readonly byComponent = new Map<string, ComponentSection>();
  private startedAt = 0;
  private totalTests = 0;
  private totalPassed = 0;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? 'component-dashboard/index.html';
  }

  onBegin(): void {
    this.startedAt = Date.now();
    for (const meta of Object.values(COMPONENT_META)) {
      if (!this.byComponent.has(meta.component)) {
        this.byComponent.set(meta.component, {
          component: meta.component,
          domain: meta.domain,
          description: meta.description,
          tests: [],
        });
      }
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const file = path.relative(process.cwd(), test.location.file).split(path.sep).join('/');
    const passed = result.status === 'passed';
    this.totalTests += 1;
    if (passed) this.totalPassed += 1;

    const componentsTouched = new Set<string>();
    for (const fixtureName of extractFixtureNames(test.location.file, test.location.line)) {
      const meta = COMPONENT_META[fixtureName];
      if (meta) componentsTouched.add(meta.component);
    }

    for (const component of componentsTouched) {
      this.byComponent.get(component)?.tests.push({
        title: test.title,
        specFile: file,
        passed,
        blocked: passed ? null : blockedReason(file, result.error?.message),
      });
    }
  }

  onEnd(result: FullResult): void {
    const durationMs = Date.now() - this.startedAt;
    const html = renderDashboard(
      [...this.byComponent.values()],
      { totalTests: this.totalTests, totalPassed: this.totalPassed },
      durationMs,
      result.status
    );

    const outPath = path.resolve(process.cwd(), this.outputFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html);
  }

  printsToStdio(): boolean {
    return false;
  }
}

function renderDashboard(
  sections: ComponentSection[],
  overall: { totalTests: number; totalPassed: number },
  durationMs: number,
  overallStatus: FullResult['status']
): string {
  const seconds = (durationMs / 1000).toFixed(1);
  const runDate = new Date().toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

  const statuses = sections.map((s) => statusOf(s.tests));
  const counts = {
    good: statuses.filter((s) => s === 'good').length,
    warning: statuses.filter((s) => s === 'warning').length,
    critical: statuses.filter((s) => s === 'critical').length,
    untested: statuses.filter((s) => s === 'untested').length,
  };

  const domainSectionsHtml = DOMAIN_ORDER.filter((domain) => sections.some((s) => s.domain === domain))
    .map((domain) => {
      const cards = sections
        .filter((s) => s.domain === domain)
        .sort((a, b) => a.component.localeCompare(b.component))
        .map(renderComponentCard)
        .join('\n');
      return `
      <section class="domain-section">
        <h2 class="domain-heading">${escapeHtml(DOMAIN_LABELS[domain])}</h2>
        <div class="component-grid">${cards}</div>
      </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Component Dashboard</title>
<style>
  :root {
    --bg: #f9f9f7;
    --surface: #fcfcfb;
    --border: #e1e0d9;
    --ink: #0b0b0b;
    --ink-muted: #52514e;
    --ink-faint: #898781;
    --accent: #2a78d6;
    --good: #0ca30c;
    --good-bg: rgba(12, 163, 12, 0.1);
    --warning: #c98500;
    --warning-bg: rgba(201, 133, 0, 0.12);
    --critical: #d03b3b;
    --critical-bg: rgba(208, 59, 59, 0.1);
    --untested: #898781;
    --untested-bg: rgba(137, 135, 129, 0.12);
  }
  :root[data-theme="dark"] {
    --bg: #0d0d0d;
    --surface: #1a1a19;
    --border: #2c2c2a;
    --ink: #ffffff;
    --ink-muted: #c3c2b7;
    --ink-faint: #898781;
    --accent: #3987e5;
    --good: #0ca30c;
    --good-bg: rgba(12, 163, 12, 0.16);
    --warning: #fab219;
    --warning-bg: rgba(250, 178, 25, 0.16);
    --critical: #e66767;
    --critical-bg: rgba(230, 103, 103, 0.16);
    --untested: #898781;
    --untested-bg: rgba(137, 135, 129, 0.16);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0d0d0d;
      --surface: #1a1a19;
      --border: #2c2c2a;
      --ink: #ffffff;
      --ink-muted: #c3c2b7;
      --ink-faint: #898781;
      --accent: #3987e5;
      --good: #0ca30c;
      --good-bg: rgba(12, 163, 12, 0.16);
      --warning: #fab219;
      --warning-bg: rgba(250, 178, 25, 0.16);
      --critical: #e66767;
      --critical-bg: rgba(230, 103, 103, 0.16);
      --untested: #898781;
      --untested-bg: rgba(137, 135, 129, 0.16);
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
  .page { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; }
  .eyebrow {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent);
    margin: 0 0 10px;
  }
  h1 { font-size: clamp(26px, 3.6vw, 34px); font-weight: 700; margin: 0 0 8px; text-wrap: balance; }
  .meta {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
    font-size: 13px;
    margin: 0 0 32px;
  }

  .stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 40px; }
  .stat-tile { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 18px; }
  .stat-value { display: block; font-size: 28px; font-weight: 700; margin-bottom: 2px; }
  .stat-label { font-size: 12.5px; color: var(--ink-muted); }
  .stat-tile--good .stat-value { color: var(--good); }
  .stat-tile--warning .stat-value { color: var(--warning); }
  .stat-tile--critical .stat-value { color: var(--critical); }
  .stat-tile--untested .stat-value { color: var(--untested); }

  .domain-section { margin-bottom: 36px; }
  .domain-heading {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin: 0 0 14px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .component-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }

  .component-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; }
  .component-card > summary { list-style: none; cursor: pointer; padding: 16px 18px; }
  .component-card > summary::-webkit-details-marker { display: none; }
  .component-card-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .component-name { font-size: 15px; font-weight: 700; }
  .component-chip {
    flex: none;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    padding: 2px 8px;
    border-radius: 100px;
    white-space: nowrap;
  }
  .component-chip--good { color: var(--good); background: var(--good-bg); }
  .component-chip--warning { color: var(--warning); background: var(--warning-bg); }
  .component-chip--critical { color: var(--critical); background: var(--critical-bg); }
  .component-chip--untested { color: var(--untested); background: var(--untested-bg); }

  .component-desc { color: var(--ink-muted); font-size: 13px; margin: 6px 0 12px; }

  .meter { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; margin-bottom: 8px; }
  .meter-fill { height: 100%; }
  .meter-fill--good { background: var(--good); }
  .meter-fill--warning { background: var(--warning); }
  .meter-fill--critical { background: var(--critical); }
  .meter-fill--untested { background: var(--untested); }

  .component-tally {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: var(--ink-faint);
  }

  .test-list { list-style: none; margin: 0; padding: 0 18px 16px; border-top: 1px solid var(--border); }
  .test-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 0 0; font-size: 12.5px; }
  .test-dot { width: 7px; height: 7px; border-radius: 2px; flex: none; margin-top: 5px; }
  .test-row--good .test-dot { background: var(--good); }
  .test-row--warning .test-dot { background: var(--warning); }
  .test-row--critical .test-dot { background: var(--critical); }
  .test-body { min-width: 0; }
  .test-title { display: block; }
  .test-file {
    display: block;
    color: var(--ink-faint);
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
    font-size: 11px;
    margin-top: 1px;
  }
  .empty-note { margin: 0; padding: 0 18px 16px; font-size: 12.5px; color: var(--ink-faint); border-top: 1px solid var(--border); padding-top: 10px; }

  footer { margin-top: 40px; font-size: 12.5px; color: var(--ink-muted); }
  footer a { color: var(--accent); }
</style>
</head>
<body>
  <div class="page">
    <p class="eyebrow">Component Dashboard</p>
    <h1>What's covered, and is it working?</h1>
    <p class="meta">Run on ${escapeHtml(runDate)} · ${seconds}s · overall: ${escapeHtml(overallStatus)}</p>

    <div class="stat-row">
      <div class="stat-tile">
        <span class="stat-value">${overall.totalPassed}/${overall.totalTests}</span>
        <span class="stat-label">Checks passing</span>
      </div>
      <div class="stat-tile stat-tile--good">
        <span class="stat-value">${counts.good}/${sections.length}</span>
        <span class="stat-label">Components fully green</span>
      </div>
      <div class="stat-tile stat-tile--warning">
        <span class="stat-value">${counts.warning}</span>
        <span class="stat-label">Need setup</span>
      </div>
      <div class="stat-tile stat-tile--critical">
        <span class="stat-value">${counts.critical}</span>
        <span class="stat-label">Have a real problem</span>
      </div>
      <div class="stat-tile stat-tile--untested">
        <span class="stat-value">${counts.untested}</span>
        <span class="stat-label">Not covered yet</span>
      </div>
    </div>

    ${domainSectionsHtml}

    <footer>
      Generated automatically from the Playwright test run — one card per framework
      component (page object / service / API client), derived from the fixtures each
      test actually declares. For the plain-language view, see
      <code>friendly-report/index.html</code>; for stack traces, run <code>npm run report</code>.
    </footer>
  </div>
</body>
</html>`;
}

function renderComponentCard(section: ComponentSection): string {
  const status = statusOf(section.tests);
  const passedCount = section.tests.filter((t) => t.passed).length;
  const pct = section.tests.length ? (passedCount / section.tests.length) * 100 : 0;

  const body = section.tests.length
    ? `<ul class="test-list">${section.tests
        .map((t) => {
          const testState = t.passed ? 'good' : t.blocked ? 'warning' : 'critical';
          return `
        <li class="test-row test-row--${testState}">
          <span class="test-dot" aria-hidden="true"></span>
          <span class="test-body">
            <span class="test-title">${escapeHtml(t.title)}</span>
            <span class="test-file">${escapeHtml(t.specFile)}</span>
          </span>
        </li>`;
        })
        .join('')}</ul>`
    : `<p class="empty-note">No test currently exercises this component.</p>`;

  return `
      <details class="component-card">
        <summary>
          <div class="component-card-top">
            <span class="component-name">${escapeHtml(section.component)}</span>
            <span class="component-chip component-chip--${status}">${STATUS_ICON[status]} ${STATUS_LABEL[status]}</span>
          </div>
          <p class="component-desc">${escapeHtml(section.description)}</p>
          <div class="meter"><div class="meter-fill meter-fill--${status}" style="width:${pct}%"></div></div>
          <span class="component-tally">${passedCount}/${section.tests.length} tests</span>
        </summary>
        ${body}
      </details>`;
}
