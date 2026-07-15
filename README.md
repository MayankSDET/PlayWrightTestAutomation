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

aws/                         AWS S3
  services/
    S3Service.ts                   Wraps the AWS SDK v3 S3Client
  config/awsConfig.ts               Region/credentials/bucket
  tests/                          s3.spec.ts
  utils/                          Placeholder — AWS-domain test data (empty for now)
  .env / .env.example              AWS_* vars (gitignored real values / committed template)

azure/                       Azure Blob Storage
  services/
    BlobService.ts                  Wraps @azure/storage-blob's BlobServiceClient
  config/azureConfig.ts             Connection string/container
  tests/                          blob.spec.ts
  utils/                          Placeholder — Azure-domain test data (empty for now)
  .env / .env.example              AZURE_* vars (gitignored real values / committed template)

fixtures/
  base.fixture.ts             Wires every class above into Playwright's `test`

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
npx playwright install chromium
```

`ui/` has no `.env` — saucedemo.com's URL is hardcoded as `baseURL` in
`playwright.config.ts`, since it's a fixed public demo site, not a per-environment
config. `database/` ships a default that works with zero setup (an in-memory SQLite DB).
`api/` is split: `api-object.spec.ts` (against `api.restful-api.dev`) needs no
credentials, but `reqres-user.spec.ts` needs a real `REQRES_API_KEY` — get a free one at
[app.reqres.in/api-keys](https://app.reqres.in/api-keys). `aws/` and `azure/` also need
real credentials before their tests can pass.

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

## 2. AWS S3

**Folder:** `aws/` · **Test:** `aws/tests/s3.spec.ts`

### What's here

`aws/config/awsConfig.ts` reads its env vars from `aws/.env` (via `loadEnv(path.resolve(__dirname,
'../.env'))`, resolving to `aws/.env`) and exposes `getAwsConfig()`. It does **not**
validate eagerly at import time — `required()` only runs when `getAwsConfig()` is
actually called, which only happens inside `S3Service`'s constructor, which only runs
when a test declares the `s3Service` fixture. That's why a test that never touches S3
still runs fine even with no `aws/.env` configured at all.

```env
# aws/.env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
```

`aws/services/S3Service.ts` wraps the AWS SDK v3 `S3Client` behind three methods:
`fileExists(key)`, `listFiles(prefix)`, `getFileContent(key)`. The constructor takes an
**optional** bucket name override (`bucket?: string`) — use that in a specific test if it
needs to point at a different bucket than the one in `aws/.env`, without adding new config.

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
`azure/config/azureConfig.ts` reads its env vars from `azure/.env`, the same way
`awsConfig.ts` reads from `aws/.env`.

```env
# azure/.env
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

**Folder:** `api/` · **Tests:** `api/tests/api-object.spec.ts`, `api/tests/reqres-user.spec.ts`

This domain holds two independent REST clients against two different public APIs, each
with its own worker-scoped `APIRequestContext` (different `baseURL`s and auth needs can't
share one context) — `ObjectApiClient` against `api.restful-api.dev` and `UserApiClient`
against [reqres.in](https://reqres.in).

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

`API_BASE_URL` (in `api/config/apiConfig.ts`, read from `api/.env`) defaults to
`https://api.restful-api.dev`, a free public test API with real (temporary) persistence,
so this spec runs and passes with zero setup.

**`api/clients/UserApiClient.ts`** targets reqres.in's user/auth endpoints instead:
`list(page)`, `getById(id)`, `exists(id)`, `create(payload)`, `update(id, payload)`,
`partialUpdate(id, payload)`, `delete(id)`, `register(payload)`, `login(payload)`.
Unlike `ObjectApiClient`, `register()`/`login()` don't assert success internally — both a
200 (valid credentials) and a 400 (e.g. missing password) are meaningful outcomes a test
needs to assert on, so these two methods return `{ status, body }` and let the test
decide what "success" means for that case, the same way `ObjectApiClient.exists()`
returns a plain boolean instead of throwing on a 404.

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
   `response.ok()` with `expect()`, then returning `response.json()` — copy the shape of
   `ObjectApiClient` exactly.
4. Export any request/response shapes as `type`s at the top of the file (see `TestObject`
   / `TestObjectPayload`), so callers get typed responses.
5. Point `API_BASE_URL` in `api/.env` at your real API.
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
| `apiRequestContext` | **worker** | `playwright.request.newContext(...)` | Shared HTTP context for `api.restful-api.dev` calls |
| `objectApiClient` | test | `apiRequestContext` | Thin wrapper exposing the REST client |
| `reqresRequestContext` | **worker** | `playwright.request.newContext(...)` with the `x-api-key` header set | Shared HTTP context for reqres.in calls |
| `userApiClient` | test | `reqresRequestContext` | Thin wrapper exposing the reqres.in client |
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

**`aws/utils/`, `azure/utils/`, `database/utils/`** each still hold a single placeholder
file (`AwsTestData.ts`, `AzureTestData.ts`, `DatabaseTestData.ts` — just a comment and
`export {}`, so the empty folder still exists in git) since those domains have no static
test data yet. Replace the placeholder with real per-concern files the first time you add
data to that domain, following the pattern `api/utils/` just switched to — and delete the
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

`playwright.config.ts`'s `reporter` array writes **two** reports on every `npm test` run:

- **`playwright-report/index.html`** (the built-in `html` reporter) — the technical
  report: stack traces, code locations, screenshots on failure. `npm run report` opens
  it. `test-results/` holds the supporting artifacts (screenshots, and traces captured
  only `on-first-retry`, so mainly relevant on CI where `retries: 2`; locally
  `retries: 0` means no retry, so no trace).
- **`friendly-report/index.html`** (`reporters/FriendlyReporter.ts`, a custom reporter)
  — a plain-language pass/fail summary for a non-technical reader: no stack traces, no
  file paths, just "Shopping Website: 14/14 passing" grouped by feature area, with
  failures explained as either **Needs setup** (a placeholder credential, not a bug —
  AWS/Azure/reqres.in all show this until real accounts are connected) or **Problem
  found** (something a developer should look at). Open the file directly in a browser;
  it's gitignored like the other report output, so it's regenerated fresh each run.

### Adding a new feature area to the friendly report

`FriendlyReporter.ts` maps each spec file to a section by a hardcoded `sectionKeyFor()`
lookup (folder prefix, e.g. `ui/tests` → `ui`, or exact file, e.g.
`api/tests/reqres-user.spec.ts` → `api-user`) and a `SECTION_META` entry (a plain-language
`label` and one-sentence `blurb`). Adding a new domain's tests to the friendly report
means adding one entry to each of `SECTION_META`, `SECTION_ORDER`, and `sectionKeyFor()`
— specs that don't match any entry are silently omitted from the friendly report (they
still appear in the full `html` report). If a domain's failures are credential-gated the
same way AWS/Azure/reqres.in are, add a matching branch to `blockedReason()` so they're
labeled "Needs setup" instead of "Problem found".
