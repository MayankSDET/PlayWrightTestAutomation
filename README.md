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
.env / .env.example         Real secrets (gitignored) / the template you copy from
.gitignore                  What never gets committed

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

api/                        REST API client(s)
  clients/
    BaseApiClient.ts               Shared API client behavior
    ObjectApiClient.ts              Client for one REST resource
  config/apiConfig.ts              API base URL
  tests/                          api-object.spec.ts
  utils/                          Placeholder — API-domain test data (empty for now)

database/                   SQL database testing (SQLite)
  services/
    DbService.ts                   Low-level, table-agnostic SQLite wrapper
  repositories/
    BaseRepository.ts               Shared repository behavior
    UserRepository.ts               Queries for the `users` table
  config/dbConfig.ts               DB file path
  tests/                          db-user.spec.ts
  utils/                          Placeholder — database-domain test data (empty for now)

aws/                         AWS S3
  services/
    S3Service.ts                   Wraps the AWS SDK v3 S3Client
  config/awsConfig.ts               Region/credentials/bucket
  tests/                          s3.spec.ts
  utils/                          Placeholder — AWS-domain test data (empty for now)

azure/                       Azure Blob Storage
  services/
    BlobService.ts                  Wraps @azure/storage-blob's BlobServiceClient
  config/azureConfig.ts             Connection string/container
  tests/                          blob.spec.ts
  utils/                          Placeholder — Azure-domain test data (empty for now)

fixtures/
  base.fixture.ts             Wires every class above into Playwright's `test`

config/
  loadEnv.ts                    Loads .env exactly once, shared by every domain's config
```

## Setup

```bash
npm install
cp .env.example .env   # fill in real values where noted below
npx playwright install chromium
```

Run everything:

```bash
npm test              # npx playwright test
npm run test:headed   # same, with a visible browser
npm run report        # open the last HTML report
```

Run one domain at a time:

```bash
npx playwright test ui/tests           # UI (saucedemo.com)
npx playwright test api/tests          # REST API
npx playwright test aws/tests          # AWS S3
npx playwright test azure/tests        # Azure Blob Storage
npx playwright test database/tests     # SQL (SQLite)
```

`playwright.config.ts` sets `testDir: '.'` with `testMatch: '**/tests/**/*.spec.ts'`, so
any `tests/` folder under any domain is picked up automatically — adding a new domain
folder with its own `tests/` subfolder needs no config change.

---

## Root & config files

| File | What's in it | When you'd touch it |
|---|---|---|
| `playwright.config.ts` | `testDir`/`testMatch`, `baseURL`, `retries`/`workers` (CI vs local), timeouts, the `html` reporter, the `chromium` project | Adding a browser/project, changing timeouts, pointing `baseURL` at a real app |
| `tsconfig.json` | Compiler target/strictness | Rarely — only if you need a new TS feature or path alias |
| `package.json` | `npm test` / `test:headed` / `report` scripts, all dependencies | Adding a new npm script, or a new dependency when you add an integration |
| `.env.example` | The full list of env vars the framework understands, with placeholder values and comments | **Every time you add a new env var**, add it here too so the next person knows it exists |
| `.env` | Real values, gitignored | Never commit this. Copy `.env.example` to make it |
| `.gitignore` | `node_modules/`, `.env`, Playwright's own output dirs, `.claude/settings.local.json` | Add new generated-output directories here as they show up |
| `config/loadEnv.ts` | Loads `.env` once, shared by every domain's `config/*.ts` | See [The env-loading pattern](#the-env-loading-pattern-configloadenvts) below |

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

## 2. AWS S3

**Folder:** `aws/` · **Test:** `aws/tests/s3.spec.ts`

### What's here

`aws/config/awsConfig.ts` reads four env vars and exposes `getAwsConfig()`. It does
**not** validate eagerly at import time — `required()` only runs when `getAwsConfig()` is
actually called, which only happens inside `S3Service`'s constructor, which only runs
when a test declares the `s3Service` fixture. That's why a test that never touches S3
still runs fine even with no AWS credentials configured at all.

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
```

`aws/services/S3Service.ts` wraps the AWS SDK v3 `S3Client` behind three methods:
`fileExists(key)`, `listFiles(prefix)`, `getFileContent(key)`. The constructor takes an
**optional** bucket name override (`bucket?: string`) — use that in a specific test if it
needs to point at a different bucket than the one in `.env`, without adding new config.

```ts
test('Verify an uploaded file exists in the S3 bucket', async ({ s3Service }) => {
  expect(await s3Service.fileExists('sample-folder/sample-file.txt')).toBeTruthy();
});
```

### Adding a new S3 operation

1. Add a method to `S3Service` (e.g. `uploadFile(key, body)`, `deleteFile(key)`), using
   `this.client.send(new SomeCommand({ Bucket: this.bucket, ... }))` — same shape as the
   existing three methods.
2. If it needs a new AWS SDK import, add it to the `@aws-sdk/client-s3` import at the top
   of the file — don't introduce a second S3 client.
3. Never expose `this.client` publicly. If a test needs a capability, that capability
   becomes a named method on `S3Service`, not a reason to leak the SDK client.
4. Put its spec in `aws/tests/`.

---

## 3. Azure Blob Storage

**Folder:** `azure/` · **Test:** `azure/tests/blob.spec.ts`

### What's here

Same pattern as S3, using `@azure/storage-blob`'s `BlobServiceClient` instead:
`fileExists(blobName)`, `listFiles(prefix)`, `getFileContent(blobName)`. The constructor
takes an optional container-name override, same idea as `S3Service`'s optional bucket.

```env
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER_NAME=...
```

```ts
test('Verify an uploaded file exists in the Blob container', async ({ blobService }) => {
  expect(await blobService.fileExists('sample-folder/sample-file.txt')).toBeTruthy();
});
```

### Adding a new Blob Storage operation

Same recipe as S3: add a method to `BlobService` that goes through
`this.containerClient`, following the shape of `fileExists`/`listFiles`/`getFileContent`.
The `streamToString()` helper at the bottom of the file exists because Azure's SDK
returns a Node stream for downloads — reuse it for any new method that reads blob
content, don't write a second stream-reading helper. Put its spec in `azure/tests/`.

---

## 4. API testing (chained/dependent calls)

**Folder:** `api/` · **Test:** `api/tests/api-object.spec.ts`

### What's here

`api/clients/BaseApiClient.ts` is one line on purpose — it just holds `protected readonly
request: APIRequestContext` so every API client shares the same constructor shape. This
layer exists to demonstrate **dependency chaining**: a sequence of calls where each step
needs data returned by a previous one.

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

`API_BASE_URL` (in `api/config/apiConfig.ts`) defaults to `https://api.restful-api.dev`,
a free public test API with real (temporary) persistence, so this spec runs and passes
with zero setup.

### Adding a client for your own API

1. Create `api/clients/YourResourceApiClient.ts`, `extends BaseApiClient`.
2. Give it a `private readonly basePath` for its endpoint.
3. One method per operation, each doing `this.request.<verb>(path, { data })`, checking
   `response.ok()` with `expect()`, then returning `response.json()` — copy the shape of
   `ObjectApiClient` exactly.
4. Export any request/response shapes as `type`s at the top of the file (see `TestObject`
   / `TestObjectPayload`), so callers get typed responses.
5. Point `API_BASE_URL` in `.env` at your real API.
6. Register the new client as a fixture (test-scoped, depending on `apiRequestContext`)
   in `fixtures/base.fixture.ts` — copy the `objectApiClient` fixture entry.
7. Put its spec in `api/tests/`.

---

## 5. SQL database testing

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

`DB_FILE_PATH` defaults to `:memory:` — a fresh, in-memory database, migrated once per
worker (see [Fixtures](#fixtures)) and needing zero external setup. Set it to a real file
path (e.g. `./data/test.db`) to test against a persistent SQLite file instead.

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
| `blobService` | **worker** | `new BlobService()` | Shared Azure Blob client |
| `apiRequestContext` | **worker** | `playwright.request.newContext(...)` | Shared HTTP context for API calls |
| `objectApiClient` | test | `apiRequestContext` | Thin wrapper exposing the REST client |
| `dbService` | **worker** | `new DbService()` + `.migrate()` | Shared, already-migrated SQLite connection |
| `userRepository` | test | `dbService` | Thin wrapper exposing the repository |

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

**Folders:** `ui/tests/`, `api/tests/`, `database/tests/`, `aws/tests/`, `azure/tests/` —
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

**`ui/utils/`** is the one domain with real data in it so far:

| File | Exports | Used by |
|---|---|---|
| `Users.ts` | `users` — the six standard saucedemo accounts | `login.spec.ts`, `fixtures/base.fixture.ts` (`authenticatedInventoryPage`) |
| `CheckoutData.ts` | `checkoutInfo` — first name/last name/postal code for the checkout form | `checkout.spec.ts` |
| `Products.ts` | `products` — product name constants asserted against in specs | `inventory.spec.ts`, `cart.spec.ts`, `checkout.spec.ts` |

**`api/utils/`, `aws/utils/`, `azure/utils/`, `database/utils/`** each hold a single
placeholder file today (`ApiTestData.ts`, `AwsTestData.ts`, `AzureTestData.ts`,
`DatabaseTestData.ts` — just a comment and `export {}`, so the empty folder still exists
in git) since those domains have no static test data yet. Replace the placeholder with
real per-concern files the first time you add data to that domain, and delete the
placeholder once it's no longer the only thing in the folder.

### Adding new test data

1. Decide which domain the data belongs to (`ui/utils/`, `api/utils/`, `aws/utils/`,
   `azure/utils/`, or `database/utils/`).
2. Create one file per concern (e.g. `ui/utils/YourConcern.ts`), named for what it holds,
   not for the fact that it's "data" — `Users.ts`, not `UserTestData.ts`.
3. Export a single `const` (object or array) per file, same shape as `users` /
   `checkoutInfo` / `products`.
4. Import it directly where needed — specs import from `../utils/YourConcern`,
   `fixtures/base.fixture.ts` imports from `../<domain>/utils/YourConcern`.

---

## The env-loading pattern (`config/loadEnv.ts`)

`config/loadEnv.ts` stays at the project root because every domain's config file depends
on it. Each domain's own `config/*.ts` (`aws/config/awsConfig.ts`,
`azure/config/azureConfig.ts`, `api/config/apiConfig.ts`, `database/config/dbConfig.ts`)
follows the same two rules — copy them when you add a new integration's config file:

1. **Load `.env` through the shared `loadEnv()`**, not your own `dotenv.config()` call.
   `loadEnv()` guards itself with a module-level flag so `.env` is only ever read from
   disk once, no matter how many config files import it.
2. **Validate lazily.** Wrap required env vars in a `getXyzConfig()` function (not a
   plain exported object) so nothing throws until something actually calls it — which,
   in this framework, only happens inside the relevant service's constructor. This is
   why running the full suite without AWS/Azure credentials configured doesn't break the
   API/DB/UI tests: their fixtures never call `getAwsConfig()`/`getAzureConfig()` at all.

---

## Reports

The `html` reporter (`playwright.config.ts`) writes `playwright-report/index.html` after
every run. `npm run report` opens it. `test-results/` holds the supporting artifacts
(screenshots on failure, and traces — captured only `on-first-retry`, so mainly relevant
on CI where `retries: 2`; locally `retries: 0` means no retry, so no trace).
