# Playwright Fixture Framework

A Playwright + TypeScript test framework built around a single idea: every external
dependency — a browser page, an AWS bucket, an Azure container, a REST API, a SQL
database — is wrapped in its own class and handed to tests through fixtures. Tests never
touch a raw client, locator, or connection directly; they call intent-based methods
(`login()`, `fileExists()`, `create()`, `getById()`...) on an object the fixture already
built for them.

The codebase is organized **by domain**, not by technical layer: everything about UI
automation lives under `ui/`, everything about AWS lives under `aws/`, and so on. Each
domain folder is self-contained and follows the same internal shape: a subfolder for its
main code (`pages/` for UI, `clients/` for API, `services/` for AWS/Azure/database),
`config/` for its env-driven configuration, `tests/` for its specs, and `utils/` for its
static test data — so working on one integration never means jumping across unrelated
top-level folders.

This document is written for someone joining the project cold. Every section says two
things: **what already lives in a file**, and **exactly what you should add, and where,**
the next time you extend that part of the framework.

```
playwright.config.ts     Playwright's own config: browsers, timeouts, reporter, retries
tsconfig.json             TypeScript compiler options
package.json               Scripts + dependencies
.gitignore                  What never gets committed (incl. every domain's .env)

ui/                         UI automation for saucedemo.com (Page Object Model)
  pages/
    BasePage.ts                  Shared page behavior every page object extends
    LoginPage.ts                 Login screen
    InventoryPage.ts              Products screen (sort, add/remove from cart)
    CartPage.ts                    Cart screen
    CheckoutStepOnePage.ts          Checkout: customer information
    CheckoutStepTwoPage.ts           Checkout: order overview/totals
    CheckoutCompletePage.ts           Checkout: order confirmation
  tests/                        login/inventory/cart/checkout/logout specs
  utils/
    Users.ts                      The six saucedemo accounts (username/password)
    CheckoutData.ts                 Checkout form test data (name, postal code)
    Products.ts                      Product names used across specs
  (no .env — saucedemo's baseURL is hardcoded in playwright.config.ts)

mobile/                     Mobile web testing (Playwright device emulation) for saucedemo.com
  services/
    MobileService.ts              Viewport size, touch-input, and tap-target size checks
  tests/                        mobile-viewport/mobile-tap-targets/mobile-checkout-journey specs
  utils/
    TapTargets.ts                   MIN_TAP_TARGET_PX — the WCAG minimum tap target size
  (no .env — reuses ui/'s page objects and saucedemo's hardcoded baseURL; runs under the
  Mobile Chrome/Mobile Safari projects in playwright.config.ts)

native/                     Real-device mobile browser testing (Appium + WebdriverIO) for saucedemo.com
  config/appiumConfig.ts        Appium server URL + device/platform capabilities
  screens/
    BaseScreen.ts                 Shared screen behavior every screen extends (wraps a WebdriverIO Browser)
    LoginScreen.ts                  Login screen
    InventoryScreen.ts               Products screen (title, product count, cart badge)
  tests/                        native-login.spec.ts
  utils/                        Placeholder — reuses ui/utils/Users.ts, no data of its own yet
  .env / .env.example              APPIUM_* vars (gitignored real values / committed template)

api/                        REST API client(s)
  clients/
    BaseApiClient.ts               Shared API client behavior
    ObjectApiClient.ts              Client for one REST resource
  config/apiConfig.ts              API base URL
  tests/                          api-object.spec.ts
  utils/                          Placeholder — API-domain test data (empty for now)
  .env / .env.example              API_BASE_URL (gitignored real values / committed template)

database/                   SQL database testing (SQLite)
  services/
    DbService.ts                   Low-level, table-agnostic SQLite wrapper
  repositories/
    BaseRepository.ts               Shared repository behavior
    UserRepository.ts               Queries for the `users` table
  config/dbConfig.ts               DB file path
  tests/                          db-user.spec.ts
  utils/                          Placeholder — database-domain test data (empty for now)
  .env / .env.example              DB_FILE_PATH (gitignored real values / committed template)

aws/                         AWS: S3, Lambda, VPC, Route 53
  services/
    S3Service.ts                   Wraps the AWS SDK v3 S3Client
    LambdaService.ts                 Wraps the AWS SDK v3 LambdaClient
    VpcService.ts                     Wraps the AWS SDK v3 EC2Client (VPC/subnet reads)
    Route53Service.ts                  Wraps the AWS SDK v3 Route53Client
  config/
    awsConfig.ts                     Shared region/credentials + S3 bucket name
    lambdaConfig.ts                    Shared credentials + Lambda function name
    vpcConfig.ts                        Shared credentials + VPC id
    route53Config.ts                     Shared credentials + hosted zone id
  tests/                          s3.spec.ts, lambda.spec.ts, vpc.spec.ts, route53.spec.ts
  utils/                          Placeholder — AWS-domain test data (empty for now)
  .env / .env.example              AWS_* vars (gitignored real values / committed template)

azure/                       Azure: Blob Storage, VNet, DNS, Functions
  services/
    BlobService.ts                  Wraps @azure/storage-blob's BlobServiceClient
    VNetService.ts                    Wraps @azure/arm-network's NetworkManagementClient
    DnsService.ts                      Wraps @azure/arm-dns's DnsManagementClient
    FunctionsService.ts                 Wraps @azure/arm-appservice + a plain HTTP invoke
    armErrors.ts                          Shared "is this a 404 from an ARM client?" check
  config/
    azureConfig.ts                   Connection string/container (Blob, data plane)
    azureArmConfig.ts                  Shared tenant/client/subscription/resource group
    vnetConfig.ts                        Shared ARM creds + VNet name
    dnsConfig.ts                          Shared ARM creds + DNS zone name
    functionsConfig.ts                     Shared ARM creds + function app name/URL/key
  tests/                          blob.spec.ts, vnet.spec.ts, dns.spec.ts, functions.spec.ts
  utils/                          Placeholder — Azure-domain test data (empty for now)
  .env / .env.example              AZURE_* vars (gitignored real values / committed template)

performance/                Page-load performance & Core Web Vitals (saucedemo.com)
  services/
    PerformanceService.ts          Reads navigation timing + LCP/CLS off the page
  config/performanceThresholds.ts  Per-page budgets (ms / CLS score)
  tests/                          page-load.spec.ts
  utils/                          Placeholder — performance-domain test data (empty for now)
  (no .env — budgets are hardcoded config, like ui/'s baseURL)

fixtures/
  base.fixture.ts             Wires every class above into Playwright's `test`

reporters/                  Custom Playwright reporters (see Reports section below)
  testClassification.ts        Shared blockedReason()/escapeHtml() helpers
  FriendlyReporter.ts             Plain-language report -> friendly-report/index.html
  ComponentDashboardReporter.ts     Per-component dashboard -> component-dashboard/index.html

config/
  loadEnv.ts                    Loads a given .env path exactly once; called by each domain's config with its own domain's .env
```

## Setup

```bash
npm install
cp aws/.env.example aws/.env           # fill in real AWS values
cp azure/.env.example azure/.env       # fill in real Azure values
cp api/.env.example api/.env           # fill in a real REQRES_API_KEY (see below)
cp database/.env.example database/.env # optional — has a working default
cp native/.env.example native/.env     # point at a real Appium server + device (see below)
npx playwright install chromium webkit  # webkit powers the Mobile Safari device-emulation project
```

`ui/` has no `.env` — saucedemo.com's URL is hardcoded as `baseURL` in
`playwright.config.ts`, since it's a fixed public demo site, not a per-environment
config. `mobile/` is the same: it reuses `ui/`'s page objects and `baseURL`, just under
mobile device emulation, so it needs no `.env` either. `database/` ships a default that works with zero setup (an in-memory SQLite DB).
`api/` is split: `api-object.spec.ts` (against `api.restful-api.dev`) needs no
credentials, but `reqres-user.spec.ts` needs a real `REQRES_API_KEY` — get a free one at
[app.reqres.in/api-keys](https://app.reqres.in/api-keys). `aws/` and `azure/` also need
real credentials before their tests can pass — for `aws/`, that includes an existing S3
bucket, Lambda function, VPC, and Route 53 hosted zone (`AWS_S3_BUCKET_NAME`,
`AWS_LAMBDA_FUNCTION_NAME`, `AWS_VPC_ID`, `AWS_HOSTED_ZONE_ID` in `aws/.env`); for
`azure/`, that's a storage connection string/container plus an AD app registration with
rights on the resource group and an existing VNet, DNS zone, and function app
(`AZURE_TENANT_ID`/`AZURE_CLIENT_ID`/`AZURE_CLIENT_SECRET`/`AZURE_SUBSCRIPTION_ID`/
`AZURE_RESOURCE_GROUP`, `AZURE_VNET_NAME`, `AZURE_DNS_ZONE_NAME`,
`AZURE_FUNCTION_APP_NAME`/`AZURE_FUNCTION_URL`/`AZURE_FUNCTION_KEY` in `azure/.env`). `native/`
needs the most setup of all: an Appium server (`npm install -g appium` or `npx appium`)
with the relevant driver installed (`appium driver install uiautomator2` for Android,
`appium driver install xcuitest` for iOS), and a booted Android emulator/iOS
simulator or a connected real device — `APPIUM_SERVER_URL`/`APPIUM_PLATFORM_NAME`/
`APPIUM_AUTOMATION_NAME`/`APPIUM_DEVICE_NAME`/`APPIUM_BROWSER_NAME` in `native/.env` point
at it. None of that is provisioned by this framework, the same way a real AWS/Azure
account isn't.

Run everything:

```bash
npm test              # npx playwright test
npm run test:headed   # same, with a visible browser
npm run report        # open the last HTML report
```

Run one domain at a time:

```bash
npx playwright test ui/tests           # UI (saucedemo.com)
npx playwright test mobile/tests       # Mobile web (device emulation, saucedemo.com)
npx playwright test native/tests       # Real device browser via Appium (saucedemo.com)
npx playwright test performance/tests  # Page-load performance & Web Vitals
npx playwright test api/tests          # REST API
npx playwright test aws/tests          # AWS S3
npx playwright test azure/tests        # Azure: Blob Storage, VNet, DNS, Functions
npx playwright test database/tests     # SQL (SQLite)
```

`playwright.config.ts` sets `testDir: '.'` with `testMatch: '**/tests/**/*.spec.ts'`, so
any `tests/` folder under any domain is picked up automatically — adding a new domain
folder with its own `tests/` subfolder needs no config change, unless (like `mobile/`) it
needs to run under a different Playwright *project* (browser/device), in which case that
project's own `testMatch`/`testIgnore` needs updating too — see `mobile/`'s section below.

---

## Root & config files

| File | What's in it | When you'd touch it |
|---|---|---|
| `playwright.config.ts` | `testDir`/`testMatch`, `baseURL`, `retries`/`workers` (CI vs local), timeouts, the `html` reporter, the `chromium` project, plus the `Mobile Chrome`/`Mobile Safari` device-emulation projects (scoped to `mobile/tests/**` via `testMatch`, and excluded from `chromium` via `testIgnore`) | Adding a browser/project/device, changing timeouts, pointing `baseURL` at a real app |
| `tsconfig.json` | Compiler target/strictness | Rarely — only if you need a new TS feature or path alias |
| `package.json` | `npm test` / `test:headed` / `report` scripts, all dependencies | Adding a new npm script, or a new dependency when you add an integration |
| `<domain>/.env.example` | That domain's env vars, with placeholder values and comments (e.g. `aws/.env.example`) | **Every time you add a new env var**, add it to the relevant domain's `.env.example` |
| `<domain>/.env` | That domain's real values, gitignored | Never commit this. Copy the matching `.env.example` to make it |
| `.gitignore` | `node_modules/`, `.env` (matches at any depth, so every domain's `.env` is covered), Playwright's own output dirs, `.claude/settings.local.json` | Add new generated-output directories here as they show up |
| `config/loadEnv.ts` | Loads a given `.env` path exactly once (tracked by path, not a single flag) — called by every domain's `config/*.ts` with that domain's own `.env` | See [The env-loading pattern](#the-env-loading-pattern-configloadenvts) below |

---

## 1. UI automation (Page Object Model)

**Folder:** `ui/` · **Tests:** `ui/tests/login.spec.ts`, `ui/tests/inventory.spec.ts`,
`ui/tests/cart.spec.ts`, `ui/tests/checkout.spec.ts`, `ui/tests/logout.spec.ts`

This domain automates the full user journey on [saucedemo.com](https://www.saucedemo.com)
(`playwright.config.ts`'s `baseURL`), Sauce Labs' public demo store: log in, browse/sort
products, manage the cart, complete checkout, and log out.

### What's here

`BasePage` is an **abstract class** — you never instantiate it directly, only extend it.
It holds the `Page` (as `protected readonly page`, so subclasses can use it but tests
can't reach it) and the handful of things every page needs:

```ts
// ui/pages/BasePage.ts
export abstract class BasePage {
  protected readonly page: Page;
  async goto(path: string = '/') { await this.page.goto(path); }
  async verifyTitle(expectedTitle: string | RegExp) { ... }
  async verifyURL(expectedURL: string | RegExp) { ... }
}
```

Each real page (`LoginPage`, `InventoryPage`, `CartPage`, `CheckoutStepOnePage`,
`CheckoutStepTwoPage`, `CheckoutCompletePage`) lives in `ui/pages/`, extends `BasePage`,
and follows the same three rules everywhere in this codebase:

1. **Locators are `private readonly` fields.** Nothing outside the class can reach a
   locator — no test ever writes `loginPage.usernameInput`.
2. **Every user-visible action is a `public async` method** with a name describing
   intent, not mechanics: `login(username, password)`, not `fillFormAndClick()`.
3. **`goto()` calls `super.goto(path)`** with that page's own route, so a test never
   hardcodes a URL.

```ts
// ui/pages/LoginPage.ts
export class LoginPage extends BasePage {
  private readonly usernameInput = this.page.locator('#user-name');
  private readonly passwordInput = this.page.locator('#password');
  private readonly loginButton = this.page.locator('#login-button');

  async goto() { await super.goto('/'); }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

`InventoryPage` covers sorting (`sortBy('lohi' | 'hifi' | 'az' | 'za')`), adding/removing
items (`addProductToCart(name)` / `removeProductFromCart(name)`), reading the cart badge
count, and logging out via the burger menu. `CartPage` and the three checkout page
objects (`CheckoutStepOnePage` → `CheckoutStepTwoPage` → `CheckoutCompletePage`) mirror
saucedemo's own three-step checkout flow, one class per screen.

`ui/utils/` holds this domain's static test data, one file per concern (same "one thing
per file" rule as `pages/`): `Users.ts` exports the six standard saucedemo accounts
(`standard`, `lockedOut`, `problem`, `performanceGlitch`, `error`, `visual` — all
password `secret_sauce`), `CheckoutData.ts` exports the checkout form fill-in values, and
`Products.ts` exports the product names specs assert against.

### Adding a new page object

1. Create `ui/pages/YourPage.ts`, `extends BasePage`.
2. Declare its locators as `private readonly` fields at the top of the class.
3. Add one `async` method per user action or assertion the page needs to support.
   Don't add a generic "click(locator)" helper — every method should describe *what*
   it does, not just wrap a Playwright API 1:1.
4. Register it in `fixtures/base.fixture.ts` (see the [Fixtures](#fixtures) section below)
   so tests get it by declaring `{ yourPage }` instead of writing `new YourPage(page)`
   themselves.
5. If several tests need the page in a pre-set state (e.g. already logged in, already
   on a specific tab), add a **composed fixture** the way `authenticatedInventoryPage`
   does it — see the Fixtures section.
6. Put its spec in `ui/tests/`, not a new top-level folder.
7. If it needs its own static test data, add a file per concern under `ui/utils/`
   (e.g. `ui/utils/YourConcern.ts`), the same way `Users.ts` / `CheckoutData.ts` /
   `Products.ts` do — don't lump unrelated data into one shared file.

---

## 2. Page-load performance testing

**Folder:** `performance/` · **Test:** `performance/tests/page-load.spec.ts`

This domain checks that key saucedemo.com pages load fast and paint a stable layout —
not by hitting the app with load/concurrency (that's a different tool, e.g. k6), but by
reading the same performance data a real browser exposes to `web.dev`-style Web Vitals
tooling, for a single page load, and asserting it stays under a budget.

### What's here

**`performance/services/PerformanceService.ts`** takes a Playwright `Page` and reads two
kinds of metrics straight out of the browser's own Performance APIs — no new dependency:

- `getNavigationTiming(page)` — reads the page's `PerformanceNavigationTiming` entry and
  returns `ttfbMs` (time to first byte), `domContentLoadedMs`, and `loadMs`.
- `getWebVitals(page)` — sets up `PerformanceObserver`s (with `buffered: true`, so
  already-recorded entries are included) for **LCP** (largest contentful paint) and
  **CLS** (cumulative layout shift), waits briefly for their async callbacks to fire, and
  returns `{ fcpMs, lcpMs, cls }`.

```ts
test('Login page meets load-time and Web Vitals budgets', async ({ page, loginPage, performanceService }) => {
  await loginPage.goto();

  const timing = await performanceService.getNavigationTiming(page);
  const vitals = await performanceService.getWebVitals(page);

  expect(timing.loadMs).toBeLessThan(performanceThresholds.login.loadMs);
  expect(vitals.cls).toBeLessThan(performanceThresholds.login.cls);
});
```

`performance/config/performanceThresholds.ts` holds the budget per page (`login`,
`inventory`) — `domContentLoadedMs`, `loadMs`, `lcpMs`, `cls` — as plain hardcoded
constants, the same way `ui/`'s `baseURL` is hardcoded in `playwright.config.ts`: these
are budgets for a fixed public demo site, not per-environment config, so there's no
`.env` for this domain.

`vitals.lcpMs` can be `null` on a page with no qualifying paint (e.g. no large
image/text block) — specs only assert on it when it's present, and always assert on
`cls`, which is always a number (zero if nothing shifted).

### Adding a performance check for a new page

1. Add that page's budget to `performance/config/performanceThresholds.ts`.
2. Navigate to the page using its existing page object / fixture (don't add raw
   `page.goto()` calls in the spec — reuse `loginPage`, `authenticatedInventoryPage`, etc.).
3. Call `performanceService.getNavigationTiming(page)` and/or `.getWebVitals(page)` and
   assert each metric against its budget from step 1.
4. Put the test in `performance/tests/` — one file per page/flow if it grows, the same
   way `ui/tests/` is split by screen.

---

## 3. AWS (S3, Lambda, VPC, Route 53)

**Folder:** `aws/` · **Tests:** `aws/tests/s3.spec.ts`, `aws/tests/lambda.spec.ts`,
`aws/tests/vpc.spec.ts`, `aws/tests/route53.spec.ts`

This domain holds one service class per AWS resource, all sharing one set of AWS
credentials but each otherwise independent — same shape as `api/`'s two REST clients.

### What's here

**Shared credentials:** `aws/config/awsConfig.ts` exports `getAwsCredentials()`
(`region`/`accessKeyId`/`secretAccessKey`, read from `aws/.env`), which every other
config in this domain calls so the three credential vars aren't re-declared per service.
`getAwsConfig()` (used by `S3Service`) layers `AWS_S3_BUCKET_NAME` on top of that.
Validation is still fully **lazy** — `required()` only runs when a service's constructor
actually runs, which only happens when a test declares that service's fixture, so a test
that never touches Lambda/VPC/Route 53 runs fine without their env vars set.

```env
# aws/.env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
AWS_LAMBDA_FUNCTION_NAME=...
AWS_VPC_ID=...
AWS_HOSTED_ZONE_ID=...
```

| Service | Own config | Extra env var | Methods |
|---|---|---|---|
| `S3Service` | `awsConfig.ts` | `AWS_S3_BUCKET_NAME` | `fileExists(key)`, `listFiles(prefix)`, `getFileContent(key)` |
| `LambdaService` | `lambdaConfig.ts` | `AWS_LAMBDA_FUNCTION_NAME` | `functionExists()`, `invoke(payload)`, `listFunctions()` |
| `VpcService` | `vpcConfig.ts` | `AWS_VPC_ID` | `vpcExists()`, `getCidrBlock()`, `listSubnetIds()` |
| `Route53Service` | `route53Config.ts` | `AWS_HOSTED_ZONE_ID` | `hostedZoneExists()`, `listRecordNames()`, `recordExists(name, type)` |

Each service's constructor takes an **optional** override for its resource id (bucket
name / function name / VPC id / hosted zone id) — pass one in a specific test to point at
a different resource than the one in `aws/.env`, without adding new config, the same way
`S3Service`'s `bucket?: string` param already worked.

```ts
test('Verify the configured Lambda function exists', async ({ lambdaService }) => {
  expect(await lambdaService.functionExists()).toBeTruthy();
});

test('List subnets returns at least one subnet', async ({ vpcService }) => {
  expect((await vpcService.listSubnetIds()).length).toBeGreaterThan(0);
});
```

Each service catches its resource's own "not found" exception in its `*Exists()` method
and returns `false`, re-throwing everything else — `ResourceNotFoundException` for
Lambda, EC2's `InvalidVpcID.NotFound` error name for VPC, `NoSuchHostedZone` for
Route 53 — the same pattern as `S3Service.fileExists()`'s `S3ServiceException` check.

### Adding a new AWS resource

1. Create `aws/config/yourResourceConfig.ts`: `loadEnv(...)` the same `aws/.env` path,
   call `getAwsCredentials()` from `awsConfig.ts` for the shared vars, and `required()`
   only the one or two vars unique to your resource.
2. Create `aws/services/YourResourceService.ts`: constructor takes an optional id
   override, builds its own SDK client from `region`/`accessKeyId`/`secretAccessKey`, and
   exposes named methods — never leak the raw SDK client the way `S3Service` doesn't.
3. Add its npm package (`@aws-sdk/client-...`) to `package.json`.
4. Register it as a **worker-scoped** fixture in `fixtures/base.fixture.ts` — copy the
   `s3Service` fixture entry.
5. Put its spec in `aws/tests/`, and add its extra env var to `aws/.env.example`.

---

## 4. Azure (Blob Storage, VNet, DNS, Functions)

**Folder:** `azure/` · **Tests:** `azure/tests/blob.spec.ts`, `azure/tests/vnet.spec.ts`,
`azure/tests/dns.spec.ts`, `azure/tests/functions.spec.ts`

Like `aws/`, this domain holds one service class per Azure resource — but unlike AWS,
Azure Blob Storage (data plane, a connection string) and resource management (control
plane, an AD app registration) use genuinely different credentials, so there are **two**
independent credential sets instead of one shared one.

### What's here

**`azure/services/BlobService.ts`** is unchanged: `@azure/storage-blob`'s
`BlobServiceClient`, authenticated via a connection string, behind `fileExists(blobName)`,
`listFiles(prefix)`, `getFileContent(blobName)`. `azure/config/azureConfig.ts` reads
`AZURE_STORAGE_CONNECTION_STRING` / `AZURE_STORAGE_CONTAINER_NAME` from `azure/.env`.

**Shared ARM credentials:** `azure/config/azureArmConfig.ts` exports
`getAzureArmCredentials()` (`tenantId`/`clientId`/`clientSecret`/`subscriptionId`/
`resourceGroupName` — an AD app registration with rights on the resource group), which
`vnetConfig.ts`, `dnsConfig.ts`, and `functionsConfig.ts` each build on, adding only the
one env var unique to their resource. Same lazy-validation rule as everywhere else:
`required()` only runs when that resource's fixture is actually declared by a test.

```env
# azure/.env
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=...

AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=...

AZURE_VNET_NAME=...
AZURE_DNS_ZONE_NAME=...
AZURE_FUNCTION_APP_NAME=...
AZURE_FUNCTION_URL=...
AZURE_FUNCTION_KEY=...
```

| Service | Own config | Extra env var(s) | Methods |
|---|---|---|---|
| `BlobService` | `azureConfig.ts` | `AZURE_STORAGE_CONTAINER_NAME` | `fileExists(blobName)`, `listFiles(prefix)`, `getFileContent(blobName)` |
| `VNetService` | `vnetConfig.ts` | `AZURE_VNET_NAME` | `vnetExists()`, `getAddressSpace()`, `listSubnetNames()` |
| `DnsService` | `dnsConfig.ts` | `AZURE_DNS_ZONE_NAME` | `zoneExists()`, `listRecordSetNames()`, `recordExists(name, type)` |
| `FunctionsService` | `functionsConfig.ts` | `AZURE_FUNCTION_APP_NAME`, `AZURE_FUNCTION_URL`, `AZURE_FUNCTION_KEY` | `functionAppExists()`, `invoke(payload)`, `listFunctions()` |

`VNetService`, `DnsService`, and `FunctionsService` are built on the management-plane SDKs
(`@azure/arm-network`, `@azure/arm-dns`, `@azure/arm-appservice`) via
`@azure/identity`'s `ClientSecretCredential`, unlike `BlobService`'s data-plane client.
Their `*Exists()` methods all catch the same shape of error — a `RestError` with
`statusCode: 404` — through one shared helper, `azure/services/armErrors.ts`'s
`isAzureNotFoundError()`, instead of each service repeating an identical check.
`FunctionsService.invoke()` is the one method that doesn't go through the ARM client at
all: Azure Functions are invoked over plain HTTP (`fetch` against the function's trigger
URL with its function key), not through a management API, mirroring how `LambdaService`
in `aws/` uses a dedicated `InvokeCommand` instead of a "management" call.

```ts
test('Verify the configured VNet exists', async ({ vnetService }) => {
  expect(await vnetService.vnetExists()).toBeTruthy();
});

test('Invoking the function returns a successful status code', async ({ functionsService }) => {
  const result = await functionsService.invoke({ sample: 'payload' });
  expect(result.statusCode).toBe(200);
});
```

Each service's constructor takes an **optional** override for its resource name (VNet
name / DNS zone name / function app name), same idea as `S3Service`'s optional bucket.

### Adding a new Azure resource

1. Create `azure/config/yourResourceConfig.ts`: `loadEnv(...)` the same `azure/.env`
   path, call `getAzureArmCredentials()` from `azureArmConfig.ts` for the shared vars
   (or `azureConfig.ts`'s connection string, if it's data-plane like Blob), and
   `required()` only the var(s) unique to your resource.
2. Create `azure/services/YourResourceService.ts`: constructor takes an optional name
   override, builds its own client (ARM client + `ClientSecretCredential`, or the
   relevant data-plane SDK), and exposes named methods — reuse `isAzureNotFoundError()`
   from `armErrors.ts` for any ARM-backed `*Exists()` check instead of writing a new one.
3. Add its npm package(s) (`@azure/arm-...`) to `package.json`.
4. Register it as a **worker-scoped** fixture in `fixtures/base.fixture.ts` — copy the
   `blobService` fixture entry.
5. Put its spec in `azure/tests/`, and add its extra env var(s) to `azure/.env.example`.

---

## 5. API testing (chained/dependent calls)

**Folder:** `api/` · **Tests:** `api/tests/api-object.spec.ts`, `api/tests/reqres-user.spec.ts`

This domain holds two independent REST clients against two different public APIs, each
with its own worker-scoped `APIRequestContext` (different `baseURL`s and auth needs can't
share one context) — `ObjectApiClient` against `api.restful-api.dev` and `UserApiClient`
against [reqres.in](https://reqres.in).

### What's here

`api/clients/BaseApiClient.ts` holds the shared constructor (`protected readonly request:
APIRequestContext`) plus two protected helpers every client uses instead of a bare
Playwright assertion: `ensureOk(response, action)` throws with the actual status + response
body when a call fails, and `ensureStatus(response, expectedStatus, action)` does the same
for an exact-status check (`create`'s `201`, `delete`'s `204`). A failure then reads as
`Get user 2 failed: 403 Forbidden — {"error":"invalid_api_key",...}` instead of a bare
`expected true, received false` — the difference between a real bug and a rate-limited or
misconfigured external service is obvious from the test output alone. This layer also
demonstrates **dependency chaining**: a sequence of calls where each step needs data
returned by a previous one.

```ts
// api/clients/ObjectApiClient.ts
export class ObjectApiClient extends BaseApiClient {
  private readonly basePath = '/objects';
  async create(payload: TestObjectPayload): Promise<TestObject> { ... }
  async get(id: string): Promise<TestObject> { ... }
  async update(id: string, payload: TestObjectPayload): Promise<TestObject> { ... }
  async delete(id: string): Promise<void> { ... }
  async exists(id: string): Promise<boolean> { ... }
}
```

```ts
test('create -> get -> update -> delete: chained object lifecycle', async ({ objectApiClient }) => {
  const created = await objectApiClient.create({ name: '...', data: { ... } });   // step 1
  const fetched = await objectApiClient.get(created.id);                          // uses id from step 1
  const updated = await objectApiClient.update(created.id, { name: '...' });       // same id
  await objectApiClient.delete(created.id);                                       // same id
  expect(await objectApiClient.exists(created.id)).toBeFalsy();                   // confirms cleanup
});
```

`API_BASE_URL` (in `api/config/apiConfig.ts`, read from `api/.env`) defaults to
`https://api.restful-api.dev`, a free public test API with real (temporary) persistence,
so this spec runs with zero setup — but that API now enforces a shared daily request
quota per caller (50/24h unauthenticated, 100/24h with a free key), easy to exhaust
across a handful of local runs. If `api-object.spec.ts` starts failing with `"You've
reached the daily request limit"`, that's this quota, not a bug — set the optional
`API_KEY` in `api/.env` (get one at [restful-api.dev/sign-in](https://restful-api.dev/sign-in))
for the higher tier, or wait for the daily reset. `apiRequestContext` in
`fixtures/base.fixture.ts` only attaches the `x-api-key` header when `API_KEY` is set, so
leaving it unset still works exactly as before.

**`api/clients/UserApiClient.ts`** targets reqres.in's user/auth endpoints instead:
`list(page)`, `getById(id)`, `exists(id)`, `create(payload)`, `update(id, payload)`,
`partialUpdate(id, payload)`, `delete(id)`, `register(payload)`, `login(payload)`.
Unlike `ObjectApiClient`, `register()`/`login()` don't assert success internally — both a
200 (valid credentials) and a 400 (e.g. missing password) are meaningful outcomes a test
needs to assert on, so these two methods return `{ status, body }` and let the test
decide what "success" means for that case. `exists(id)` on both clients only treats a
genuine `404` as "doesn't exist" (`false`) — any other non-2xx (a `403` from a bad key, a
rate limit, a `500`) still throws via `ensureOk()`, so a broken credential can't
masquerade as "the record isn't there".

Unlike `api.restful-api.dev`, reqres.in now requires a free `x-api-key` header on every
request (get one at [app.reqres.in/api-keys](https://app.reqres.in/api-keys)). That key
is read from `REQRES_API_KEY` in `api/.env` by `api/config/reqresConfig.ts` and attached
once, worker-wide, in the `reqresRequestContext` fixture:

```ts
// fixtures/base.fixture.ts
reqresRequestContext: [async ({ playwright }, use) => {
  const config = getReqresConfig();
  const context = await playwright.request.newContext({
    baseURL: config.baseURL,
    extraHTTPHeaders: { 'x-api-key': config.apiKey },
  });
  await use(context);
  await context.dispose();
}, { scope: 'worker' }],
```

Same lazy-validation rule as AWS/Azure: `getReqresConfig()` only throws when a test
actually declares `userApiClient` (or `reqresRequestContext` directly) — specs that never
touch reqres.in run fine with no key configured.

```ts
test('GET /api/users lists users on the requested page', async ({ userApiClient }) => {
  const page = await userApiClient.list(2);
  expect(page.data[0].id).toBe(7);
});

test('POST /api/login fails without a password', async ({ userApiClient }) => {
  const result = await userApiClient.login(login.missingPassword);
  expect(result.status).toBe(400);
});
```

`api/utils/ReqresCredentials.ts` and `api/utils/ReqresUserPayloads.ts` hold the test data
these specs assert against — reqres.in's documented fixture accounts/responses (e.g.
`eve.holt@reqres.in` for a successful register/login), split by concern the same way
`ui/utils/` is.

### Adding a client for your own API

1. Create `api/clients/YourResourceApiClient.ts`, `extends BaseApiClient`.
2. Give it a `private readonly basePath` for its endpoint.
3. One method per operation, each doing `this.request.<verb>(path, { data })`, checking
   the result with `await this.ensureOk(response, 'Some action')` (or `ensureStatus(...)`
   for an exact code), then returning `response.json()` — copy the shape of
   `ObjectApiClient` exactly. Don't reach for a bare `expect(response.ok())`: it throws
   with no information about *why*, which is exactly the debugging dead-end `ensureOk()`
   exists to avoid.
4. Export any request/response shapes as `type`s at the top of the file (see `TestObject`
   / `TestObjectPayload`), so callers get typed responses.
5. Point `API_BASE_URL` in `api/.env` at your real API.
6. Register the new client as a fixture (test-scoped, depending on `apiRequestContext`)
   in `fixtures/base.fixture.ts` — copy the `objectApiClient` fixture entry.
7. Put its spec in `api/tests/`.

---

## 6. SQL database testing

**Folder:** `database/` · **Test:** `database/tests/db-user.spec.ts`

### What's here

This domain has two levels, and it's important to know which one to extend:

- **`database/services/DbService.ts`** is the *only* file that talks to `better-sqlite3` directly.
  It exposes generic, table-agnostic methods: `run(sql, params)`, `queryAll(sql, params)`,
  `queryOne(sql, params)`, `migrate()`, `close()`. It has no idea what a "user" is.
- **`database/repositories/UserRepository.ts`** is where table-specific knowledge lives.
  It `extends BaseRepository` (which just holds `protected readonly db: DbService`) and
  turns raw SQL into named methods: `create`, `getById`, `update`, `delete`, `exists`.

```ts
test('create -> get -> update -> delete: chained user record', async ({ userRepository }) => {
  const created = userRepository.create('jdoe', 'jdoe@example.com');
  const fetched = userRepository.getById(created.id);
  const updated = userRepository.update(created.id, { email: 'jdoe.updated@example.com' });
  userRepository.delete(created.id);
  expect(userRepository.exists(created.id)).toBeFalsy();
});
```

`DB_FILE_PATH` (in `database/config/dbConfig.ts`, read from `database/.env`) defaults to
`:memory:` — a fresh, in-memory database, migrated once per worker (see
[Fixtures](#fixtures)) and needing zero external setup. Set it to a real file path (e.g.
`./data/test.db`) in `database/.env` to test against a persistent SQLite file instead.

### Adding a new table

1. Add its `CREATE TABLE IF NOT EXISTS ...` to `DbService.migrate()` — that's the one
   place schema is defined; don't create tables ad hoc from inside a repository.
2. Create `database/repositories/YourTableRepository.ts`, `extends BaseRepository`.
3. Export a `type` for the row shape (see `User` in `UserRepository.ts`).
4. Add one method per query the table needs — `this.db.run(...)` for
   inserts/updates/deletes, `this.db.queryOne<T>(...)` / `this.db.queryAll<T>(...)` for
   reads. Never build SQL by string-concatenating user input; always pass values through
   the `params` array like the existing methods do.
5. Register `yourTableRepository` as a test-scoped fixture in `fixtures/base.fixture.ts`,
   depending on `dbService` — copy the `userRepository` fixture entry.
6. Put its spec in `database/tests/`.

### Swapping SQLite for a real server (Postgres / MySQL / SQL Server)

Only `database/services/DbService.ts` needs to change: swap `better-sqlite3` for `pg` /
`mysql2` / `mssql`, update `database/config/dbConfig.ts`'s env vars (host/port/user/
password instead of a file path), and keep the same `run` / `queryAll` / `queryOne`
method signatures. Every repository and every fixture stays exactly as it is.

---

## 7. Mobile web testing (Playwright device emulation)

**Folder:** `mobile/` · **Tests:** `mobile/tests/mobile-viewport.spec.ts`,
`mobile/tests/mobile-tap-targets.spec.ts`, `mobile/tests/mobile-checkout-journey.spec.ts`

This domain tests the same saucedemo.com app as `ui/`, but through Playwright's built-in
mobile device emulation (viewport size, touch input, user agent) instead of a desktop
browser — it answers "does the shopping journey actually work on a phone?", not "is there
a separate native app?" (that would need Appium and a different toolchain entirely, not
Playwright).

### What's here

Unlike every other domain, `mobile/` has **no `pages/` folder** — it deliberately reuses
`ui/`'s page objects (`LoginPage`, `InventoryPage`, `CartPage`, the checkout pages) via the
fixtures already registered in `fixtures/base.fixture.ts`, the same way `performance/`
reuses them instead of duplicating locators. Duplicating page objects per device would mean
two places to update every time saucedemo's markup changes; emulation only changes the
*viewport/input*, not the DOM, so the same page objects work unmodified.

What `mobile/` *does* add is the emulation itself and a service for asserting on
mobile-specific properties a desktop-only test never checks:

```ts
// mobile/services/MobileService.ts
export class MobileService {
  async getViewportSize(page: Page): Promise<ViewportSize | null> { ... }
  async isTouchEnabled(page: Page): Promise<boolean> { ... }
  async findUndersizedTapTargets(page: Page, minSizePx = MIN_TAP_TARGET_PX): Promise<TapTarget[]> { ... }
}
```

`findUndersizedTapTargets()` reads every visible `button`/`a[href]`/`input[type=submit
or button]`/`[role=button]` on the page and flags any whose rendered bounding box is
smaller than `MIN_TAP_TARGET_PX` (44px — WCAG 2.5.5's minimum touch target size, from
`mobile/utils/TapTargets.ts`) in either dimension — a real accessibility check a desktop
viewport can't surface, since desktop layouts render the same elements larger.

```ts
test('login screen renders at a phone-sized viewport', async ({ page, loginPage, mobileService }) => {
  await loginPage.goto();
  const viewport = await mobileService.getViewportSize(page);
  expect(viewport!.width).toBeLessThanOrEqual(430);
});
```

**The device emulation itself lives in `playwright.config.ts`**, not in `mobile/` — two
projects, `Mobile Chrome` (`devices['Pixel 7']`) and `Mobile Safari` (`devices['iPhone
13']`), each scoped to `testMatch: 'mobile/tests/**/*.spec.ts'` so they only ever run this
domain's specs; the `chromium` project gets a matching `testIgnore` so `mobile/tests/**`
never runs twice, once on desktop and once emulated. `Mobile Safari` needs the `webkit`
browser installed (`npx playwright install webkit`, alongside `chromium`) since
`devices['iPhone 13']` defaults to that engine.

`mobile-checkout-journey.spec.ts` mirrors `ui/tests/checkout.spec.ts`'s full login → add
to cart → checkout → confirmation flow verbatim, just running under mobile emulation — a
responsive-layout regression guard: if a future CSS change breaks the flow only at phone
widths, this is the spec that catches it while the desktop version keeps passing.

`findUndersizedTapTargets()` currently flags real, pre-existing issues on saucedemo's
inventory page (the "Add to cart" buttons are 34px tall, product-name links 20px tall,
both under the 44px minimum) — `mobile-tap-targets.spec.ts`'s inventory check is expected
to fail until that's fixed on the app side; this is the framework doing its job, not a
setup gap like AWS/Azure's credential-gated failures.

### Adding a mobile-specific check

1. Decide whether it needs a **new page** (add one to `ui/pages/` and register its
   fixture — `mobile/` never gets its own `pages/` folder) or just a **new assertion** on
   an existing page (add a method to `MobileService`, taking `page` the same way
   `getViewportSize`/`isTouchEnabled`/`findUndersizedTapTargets` do).
2. Put its spec in `mobile/tests/`, importing `test`/`expect` from
   `../../fixtures/base.fixture` like every other domain.
3. If it needs its own device profile (e.g. a tablet), add a project to
   `playwright.config.ts` with the same `testMatch: 'mobile/tests/**/*.spec.ts'` scoping,
   and install whatever browser engine that device defaults to.

---

## 8. Real device / native browser testing (Appium)

**Folder:** `native/` · **Test:** `native/tests/native-login.spec.ts`

This domain answers a question `mobile/` genuinely can't: does the app work in an actual
mobile browser, on an actual device (a real phone, a booted Android emulator, or an iOS
simulator) — real OS chrome, real rendering engine, no viewport spoofing. `mobile/`'s
Playwright device emulation is fast and needs no extra infrastructure, which makes it the
right default for everyday CI; `native/` is the slower, higher-fidelity check for when
emulation isn't enough.

### Why this can't be `BasePage`/Playwright-based

Every other domain's page objects wrap a Playwright `Page`, which only exists inside a
browser *Playwright itself* launches (Chromium/WebKit/Firefox as a local process).
Playwright has no way to drive a real or emulated mobile device — there's no ADB
connection, no simulator boot, no OS. Automating an actual device needs a different
protocol entirely: **WebDriver**, spoken to an **Appium server**, which in turn drives the
device via `UiAutomator2` (Android) or `XCUITest` (iOS). So `native/` gets its own base
class, `BaseScreen`, wrapping a WebdriverIO `Browser` session instead of a Playwright
`Page` — the two aren't interchangeable, which is why this isn't just another method on
`ui/pages/BasePage.ts`.

```ts
// native/screens/BaseScreen.ts
export abstract class BaseScreen {
  protected readonly driver: Browser;   // a WebdriverIO session, not a Playwright Page
  async open(url: string) { await this.driver.url(url); }
  async getTitle(): Promise<string> { return this.driver.getTitle(); }
}
```

`LoginScreen` and `InventoryScreen` (`native/screens/`) mirror `ui/pages/LoginPage` and
`InventoryPage` one-for-one — same three rules (locators are `private readonly` fields,
one `public async` method per user action, `open()`/navigation stays inside the class) —
just using WebdriverIO's `$()`/`$$()` element finders instead of Playwright's `locator()`.

### What's here

`native/config/appiumConfig.ts` follows the same lazy-validation pattern as every other
domain's config: `getAppiumConfig()` reads `native/.env` and only throws when a test
actually needs it.

```env
# native/.env
APPIUM_SERVER_URL=http://127.0.0.1:4723
APPIUM_PLATFORM_NAME=Android
APPIUM_AUTOMATION_NAME=UiAutomator2
APPIUM_DEVICE_NAME=emulator-5554
APPIUM_PLATFORM_VERSION=14
APPIUM_BROWSER_NAME=Chrome
```

`fixtures/base.fixture.ts`'s `nativeDriverSession` (worker-scoped) parses
`APPIUM_SERVER_URL` and opens one WebdriverIO `remote()` session per worker with those
capabilities, disposing it via `driver.deleteSession()` — worker-scoped because an Appium
session is expensive to start (it can involve booting an app on a device), unlike
Playwright's cheap per-test `page`. `loginScreen`/`inventoryScreen` wrap that shared
session; specs call `loginScreen.open()` explicitly at the start of each test (the same
way `ui/tests/login.spec.ts` calls `loginPage.goto()` itself) to reset state, since the
underlying session — and whatever screen it's currently on — persists across tests in the
same worker.

```ts
test('Standard user can log in on a real device browser', async ({ authenticatedInventoryScreen }) => {
  expect(await authenticatedInventoryScreen.getTitleText()).toBe('Products');
});
```

Without a reachable Appium server + device, `nativeDriverSession` throws on session
creation ("Unable to connect... make sure browser driver is running"), which
`testClassification.ts`'s `blockedReason()` classifies as **Needs setup** (a `native/`
file-path branch, mirroring `aws/`/`azure/`) rather than a bug — this domain always needs
real infrastructure to run, the same way AWS/Azure always need a real account.

### Adding a native check

1. Create `native/screens/YourScreen.ts`, `extends BaseScreen` — locators as `private
   readonly` fields built from `this.driver.$(...)`/`$$(...)`, one method per user action.
2. Register it as a test-scoped fixture in `fixtures/base.fixture.ts` (depending on
   `nativeDriverSession`) — copy the `loginScreen`/`inventoryScreen` entries.
3. Put its spec in `native/tests/`, importing `test`/`expect` from
   `../../fixtures/base.fixture`.
4. If it needs a different device/platform, that's a `native/.env` change
   (`APPIUM_PLATFORM_NAME`/`APPIUM_AUTOMATION_NAME`/`APPIUM_DEVICE_NAME`), not a
   `playwright.config.ts` change — unlike `mobile/`'s device profiles, Appium capabilities
   are runtime config, not a Playwright project.

---

## Fixtures

**File:** `fixtures/base.fixture.ts` — the one place everything above gets wired
together into a single `test` export that every spec imports instead of
`@playwright/test`'s own. It's the one file that reaches across every domain folder to
import page objects, services, and clients:

```ts
import { test } from '../../fixtures/base.fixture';

test('...', async ({ loginPage, s3Service, objectApiClient, userRepository }) => {
  // whichever fixtures the test actually needs — Playwright only builds those
});
```

| Fixture | Scope | Built from | What it gives you |
|---|---|---|---|
| `loginPage` / `inventoryPage` | test | `new LoginPage(page)` / `new InventoryPage(page)` | Page objects bound to that test's `page` |
| `authenticatedInventoryPage` | test | `loginPage` + `inventoryPage` | `inventoryPage`, already logged in as `users.standard` |
| `cartPage` / `checkoutStepOnePage` / `checkoutStepTwoPage` / `checkoutCompletePage` | test | `new ...Page(page)` | Page objects for the cart and each checkout step |
| `s3Service` | **worker** | `new S3Service()` | Shared AWS S3 client |
| `lambdaService` | **worker** | `new LambdaService()` | Shared AWS Lambda client |
| `vpcService` | **worker** | `new VpcService()` | Shared AWS EC2 client (VPC/subnet reads) |
| `route53Service` | **worker** | `new Route53Service()` | Shared AWS Route 53 client |
| `blobService` | **worker** | `new BlobService()` | Shared Azure Blob client |
| `vnetService` | **worker** | `new VNetService()` | Shared Azure VNet (ARM network) client |
| `dnsService` | **worker** | `new DnsService()` | Shared Azure DNS (ARM) client |
| `functionsService` | **worker** | `new FunctionsService()` | Shared Azure Functions (ARM + HTTP invoke) client |
| `apiRequestContext` | **worker** | `playwright.request.newContext(...)` | Shared HTTP context for `api.restful-api.dev` calls |
| `objectApiClient` | test | `apiRequestContext` | Thin wrapper exposing the REST client |
| `reqresRequestContext` | **worker** | `playwright.request.newContext(...)` with the `x-api-key` header set | Shared HTTP context for reqres.in calls |
| `userApiClient` | test | `reqresRequestContext` | Thin wrapper exposing the reqres.in client |
| `dbService` | **worker** | `new DbService()` + `.migrate()` | Shared, already-migrated SQLite connection |
| `userRepository` | test | `dbService` | Thin wrapper exposing the repository |
| `performanceService` | **worker** | `new PerformanceService()` | Shared helper for reading navigation timing / Web Vitals off a `page` |
| `mobileService` | **worker** | `new MobileService()` | Shared helper for viewport size, touch-input, and tap-target size checks off a `page` |
| `nativeDriverSession` | **worker** | `webdriverio`'s `remote(...)` | Shared Appium/WebDriver session against a real/emulated device |
| `loginScreen` / `inventoryScreen` | test | `new LoginScreen(...)` / `new InventoryScreen(...)` | Screen objects bound to `nativeDriverSession` |
| `authenticatedInventoryScreen` | test | `loginScreen` + `inventoryScreen` | `inventoryScreen`, already logged in as `users.standard` |

**Why the scope matters:** `worker`-scoped fixtures are created once per parallel worker
and reused across every test that worker runs — cheap and correct for stateless clients
(a DB connection, an SDK client) that don't hold per-test state. `test`-scoped fixtures
are rebuilt for every single test — use that for anything tied to that one test's `page`,
or so cheap to construct that sharing it buys nothing.

### Adding a new fixture

1. Add its type to `TestFixtures` (test-scoped) or `WorkerFixtures` (worker-scoped) at
   the top of the file.
2. Add its factory function to the `base.extend<TestFixtures, WorkerFixtures>({...})`
   object, importing the class from its domain folder (e.g. `../aws/services/S3Service`,
   `../ui/pages/YourPage`). Worker-scoped fixtures are written as a **tuple**:
   ```ts
   yourFixture: [async ({}, use) => {
     const thing = new YourThing();
     await use(thing);
     // cleanup here, e.g. thing.close()
   }, { scope: 'worker' }],
   ```
   Test-scoped ones skip the tuple/options:
   ```ts
   yourFixture: async ({ dependency }, use) => {
     await use(new YourThing(dependency));
   },
   ```
3. Ask "does this fixture hold state that must be fresh per test?" If no, scope it to
   `worker`. Everything added to this framework so far except the page objects, the
   composed auth fixture, and the two thin client wrappers is worker-scoped for exactly
   this reason.

---

## Tests

**Folders:** `ui/tests/`, `mobile/tests/`, `native/tests/`, `performance/tests/`,
`api/tests/`, `database/tests/`, `aws/tests/`, `azure/tests/` —
one spec file per concern, named after what it tests (`login.spec.ts`, `s3.spec.ts`,
`db-user.spec.ts`, not `test1.spec.ts`), living inside its own domain folder rather than
a shared top-level `tests/` directory. Every spec:

- Imports `test`/`expect` from `../../fixtures/base.fixture`, **never** from
  `@playwright/test` directly — that's what makes the custom fixtures available.
- Declares only the fixtures it actually needs as parameters; Playwright only
  constructs those.
- Contains no raw locators, SDK calls, or SQL — if you find yourself writing
  `page.locator(...)` or `new S3Client(...)` inside a test file, that logic belongs in a
  page object / service / repository instead, with a fixture in front of it.

`playwright.config.ts` discovers every domain's tests via `testMatch:
'**/tests/**/*.spec.ts'`, so a brand-new domain folder just needs its own `tests/`
subfolder — no config change required.

### Adding a new test

1. Decide which existing fixture(s) it needs, or add a new one first (see above).
2. Create `<domain>/tests/your-thing.spec.ts` under the relevant domain folder — don't
   create a new top-level `tests/` directory.
3. Write the test body purely in terms of the fixtures' methods — `await
   somePage.doSomething()`, `expect(await someService.checkSomething()).toBe(...)`.

---

## utils/

Every domain gets its own `utils/` folder for static, hand-written test data — split one
file per concern rather than one shared grab-bag file. This data is domain-specific, so
each domain has its own `utils/` rather than there being one shared top-level `utils/`
(unlike `fixtures/` and `config/loadEnv.ts`, which stay at the root because every
domain's tests/config depend on them).

**`ui/utils/`**:

| File | Exports | Used by |
|---|---|---|
| `Users.ts` | `users` — the six standard saucedemo accounts | `login.spec.ts`, `fixtures/base.fixture.ts` (`authenticatedInventoryPage`) |
| `CheckoutData.ts` | `checkoutInfo` — first name/last name/postal code for the checkout form | `checkout.spec.ts` |
| `Products.ts` | `products` — product name constants asserted against in specs | `inventory.spec.ts`, `cart.spec.ts`, `checkout.spec.ts` |

**`api/utils/`**:

| File | Exports | Used by |
|---|---|---|
| `ReqresCredentials.ts` | `registration`, `login` — reqres.in's documented valid/invalid test accounts | `reqres-user.spec.ts` |
| `ReqresUserPayloads.ts` | `newUser`, `updatedUser` — create/update request bodies | `reqres-user.spec.ts` |

**`mobile/utils/`**:

| File | Exports | Used by |
|---|---|---|
| `TapTargets.ts` | `MIN_TAP_TARGET_PX` — WCAG 2.5.5's minimum touch target size (44px) | `mobile-tap-targets.spec.ts`, `mobile/services/MobileService.ts` |

**`aws/utils/`, `azure/utils/`, `database/utils/`, `performance/utils/`, `native/utils/`**
each still hold a single placeholder file (`AwsTestData.ts`, `AzureTestData.ts`,
`DatabaseTestData.ts`, `PerformanceTestData.ts`, `NativeTestData.ts` — just a comment and
`export {}`, so the empty folder still exists in git) since those domains have no static
test data of their own yet (`native/` reuses `ui/utils/Users.ts` for login credentials).
Replace the placeholder with real per-concern files the first time you add data to that
domain, following the pattern `api/utils/` just switched to — and delete the placeholder
once it's no longer the only thing in the folder.

### Adding new test data

1. Decide which domain the data belongs to (`ui/utils/`, `mobile/utils/`, `native/utils/`,
   `api/utils/`, `aws/utils/`, `azure/utils/`, `database/utils/`, or `performance/utils/`).
2. Create one file per concern (e.g. `ui/utils/YourConcern.ts`), named for what it holds,
   not for the fact that it's "data" — `Users.ts`, not `UserTestData.ts`.
3. Export a single `const` (object or array) per file, same shape as `users` /
   `checkoutInfo` / `products`.
4. Import it directly where needed — specs import from `../utils/YourConcern`,
   `fixtures/base.fixture.ts` imports from `../<domain>/utils/YourConcern`.

---

## The env-loading pattern (`config/loadEnv.ts`)

Each domain owns its **own** `.env` — `aws/.env`, `azure/.env`, `api/.env`,
`database/.env` — instead of one shared root `.env`, since AWS credentials have nothing
to do with the DB file path, and a contributor working on one integration shouldn't need
to touch a file that also holds three other domains' secrets.

`config/loadEnv.ts` still stays at the project root, because it's the one piece of
*logic* every domain's config shares — but it no longer picks the path itself:

```ts
// config/loadEnv.ts
const loadedPaths = new Set<string>();

export function loadEnv(envPath: string): void {
  if (loadedPaths.has(envPath)) {
    return;
  }
  dotenv.config({ path: envPath, quiet: true });
  loadedPaths.add(envPath);
}
```

It tracks *which paths* have already been loaded (a `Set`, not a single boolean), because
in one test run `fixtures/base.fixture.ts` may need `aws/.env` *and* `database/.env` *and*
`api/.env` all loaded — each exactly once, but as distinct files.

Each domain's own `config/*.ts` (`aws/config/awsConfig.ts`, `azure/config/azureConfig.ts`,
`api/config/apiConfig.ts`, `database/config/dbConfig.ts`) follows the same two rules —
copy them when you add a new integration's config file:

1. **Load your domain's own `.env` through the shared `loadEnv()`**, passing the path to
   *your* domain's file, not your own `dotenv.config()` call:
   ```ts
   // aws/config/awsConfig.ts
   import * as path from 'path';
   import { loadEnv } from '../../config/loadEnv';

   loadEnv(path.resolve(__dirname, '../.env')); // resolves to aws/.env
   ```
2. **Validate lazily.** Wrap required env vars in a `getXyzConfig()` function (not a
   plain exported object) so nothing throws until something actually calls it — which,
   in this framework, only happens inside the relevant service's constructor. This is
   why running the full suite without `aws/.env`/`azure/.env` configured doesn't break
   the API/DB/UI tests: their fixtures never call `getAwsConfig()`/`getAzureConfig()` at
   all, so `aws/.env`/`azure/.env` are never even read.

---

## Reports

`playwright.config.ts`'s `reporter` array writes **three** reports on every `npm test` run.
`reporters/testClassification.ts` holds the two bits of logic all three custom reporters
would otherwise duplicate: `blockedReason(file, errorMessage?)` (is this failure just a
missing credential or an exhausted quota, not a bug?) and `escapeHtml(value)`. Some
domains are blocked by file path alone (aws/azure/reqres-user.spec.ts always need a real
credential); others, like `api-object.spec.ts`, run fine with zero setup until a shared
resource (its daily request quota) runs out, so `blockedReason` also pattern-matches a
few well-known external-service error signatures in the thrown error's own message
(`"daily request limit"`, `"invalid_api_key"`, `"Missing required environment
variable"`) — which is exactly why `BaseApiClient.ensureOk()`/`ensureStatus()` throw with
the real status and response body instead of a bare assertion: the reporters can only
classify a failure as accurately as the error message describes it.

- **`playwright-report/index.html`** (the built-in `html` reporter) — the technical
  report: stack traces, code locations, screenshots on failure. `npm run report` opens
  it. `test-results/` holds the supporting artifacts (screenshots, and traces captured
  only `on-first-retry`, so mainly relevant on CI where `retries: 2`; locally
  `retries: 0` means no retry, so no trace).
- **`friendly-report/index.html`** (`reporters/FriendlyReporter.ts`) — a plain-language
  pass/fail summary for a non-technical reader: no stack traces, no file paths, just
  "Shopping Website: 14/14 passing" grouped by feature area, with failures explained as
  either **Needs setup** (a placeholder credential, not a bug — AWS/Azure/reqres.in all
  show this until real accounts are connected) or **Problem found** (something a
  developer should look at).
- **`component-dashboard/index.html`** (`reporters/ComponentDashboardReporter.ts`) — a
  denser, developer-facing dashboard: one card per actual framework component (every
  page object, service, and API client — `LoginPage`, `S3Service`, `VNetService`, ...),
  each showing a pass-rate meter and its own expandable test list, grouped by domain,
  with hero stats up top (checks passing, components fully green, needing setup, with a
  real problem, or **not covered by any test yet** — a coverage gap the other two
  reports don't surface). Unlike `FriendlyReporter.ts`, it needs no hardcoded
  file-to-section map: `extractFixtureNames()` reads each test's own source at its
  `test.location.file`/`line` and regex-matches the fixtures it destructures (e.g.
  `async ({ lambdaService }) => {`), so which spec exercises which component is derived
  automatically instead of maintained by hand.

All three are gitignored like the other report output, so they're regenerated fresh
each run — open any of them directly in a browser.

### Adding a new feature area to the friendly report

`FriendlyReporter.ts` maps each spec file to a section by a hardcoded `sectionKeyFor()`
lookup (folder prefix, e.g. `ui/tests` → `ui`, or exact file, e.g.
`api/tests/reqres-user.spec.ts` → `api-user`) and a `SECTION_META` entry (a plain-language
`label` and one-sentence `blurb`). Adding a new domain's tests to the friendly report
means adding one entry to each of `SECTION_META`, `SECTION_ORDER`, and `sectionKeyFor()`
— specs that don't match any entry are silently omitted from the friendly report (they
still appear in the full `html` report). If a domain's failures are credential-gated the
same way AWS/Azure/reqres.in are, add a matching branch to `blockedReason()` (in
`testClassification.ts`) so they're labeled "Needs setup" instead of "Problem found".

### Adding a new component to the dashboard

Register it once in `ComponentDashboardReporter.ts`'s `COMPONENT_META` — the fixture name
from `fixtures/base.fixture.ts` as the key, and a `{ component, domain, description }`
value (add a new `domain` to `DOMAIN_ORDER`/`DOMAIN_LABELS` too if it's a new domain).
That's the only manual step: once registered, every test that destructures that fixture
is picked up automatically, and the card shows "No test currently exercises this
component" until one does — a live coverage gap, not a silent omission.
