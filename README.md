# Playwright Fixture Framework

A Playwright + TypeScript test framework built around a single idea: every external
dependency — a browser page, an AWS bucket, an Azure container, a REST API, a SQL
database — is wrapped in its own class and handed to tests through fixtures. Tests never
touch a raw client, locator, or connection directly; they call intent-based methods
(`login()`, `fileExists()`, `create()`, `getById()`...) on an object the fixture already
built for them.

This document is written for someone joining the project cold. Every section says two
things: **what already lives in a file**, and **exactly what you should add, and where,**
the next time you extend that part of the framework.

```
playwright.config.ts     Playwright's own config: browsers, timeouts, reporter, retries
tsconfig.json             TypeScript compiler options
package.json               Scripts + dependencies
.env / .env.example         Real secrets (gitignored) / the template you copy from
.gitignore                  What never gets committed

pages/                      UI page objects (Page Object Model)
  BasePage.ts                  Shared page behavior every page object extends
  LoginPage.ts                 Login screen
  DashboardPage.ts              Dashboard screen

services/                   Stateless clients for external systems
  S3Service.ts                  AWS S3
  BlobService.ts                 Azure Blob Storage
  DbService.ts                    Low-level SQLite wrapper

api/                        REST API client(s)
  BaseApiClient.ts               Shared API client behavior
  ObjectApiClient.ts              Client for one REST resource

repositories/               Table-specific data access, built on services/DbService.ts
  BaseRepository.ts               Shared repository behavior
  UserRepository.ts               Queries for the `users` table

config/                     Env-driven configuration, one file per integration
  loadEnv.ts                      Loads .env exactly once
  awsConfig.ts, azureConfig.ts, apiConfig.ts, dbConfig.ts

fixtures/
  base.fixture.ts             Wires every class above into Playwright's `test`

tests/                      One spec file per concern
utils/
  TestData.ts                  Shared static test data
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

Run one area at a time:

```bash
npx playwright test tests/login.spec.ts tests/dashboard.spec.ts   # UI
npx playwright test tests/api-object.spec.ts                      # API
npx playwright test tests/s3.spec.ts                              # AWS S3
npx playwright test tests/blob.spec.ts                            # Azure Blob Storage
npx playwright test tests/db-user.spec.ts                         # SQL (SQLite)
```

---

## Root & config files

| File | What's in it | When you'd touch it |
|---|---|---|
| `playwright.config.ts` | `testDir`, `baseURL`, `retries`/`workers` (CI vs local), timeouts, the `html` reporter, the `chromium` project | Adding a browser/project, changing timeouts, pointing `baseURL` at a real app |
| `tsconfig.json` | Compiler target/strictness | Rarely — only if you need a new TS feature or path alias |
| `package.json` | `npm test` / `test:headed` / `report` scripts, all dependencies | Adding a new npm script, or a new dependency when you add an integration |
| `.env.example` | The full list of env vars the framework understands, with placeholder values and comments | **Every time you add a new env var**, add it here too so the next person knows it exists |
| `.env` | Real values, gitignored | Never commit this. Copy `.env.example` to make it |
| `.gitignore` | `node_modules/`, `.env`, Playwright's own output dirs, `.claude/settings.local.json` | Add new generated-output directories here as they show up |

---

## 1. UI automation (Page Object Model)

**Folder:** `pages/` · **Tests:** `tests/login.spec.ts`, `tests/dashboard.spec.ts`

### What's here

`BasePage` is an **abstract class** — you never instantiate it directly, only extend it.
It holds the `Page` (as `protected readonly page`, so subclasses can use it but tests
can't reach it) and the handful of things every page needs:

```ts
// pages/BasePage.ts
export abstract class BasePage {
  protected readonly page: Page;
  async goto(path: string = '/') { await this.page.goto(path); }
  async verifyTitle(expectedTitle: string | RegExp) { ... }
  async verifyURL(expectedURL: string | RegExp) { ... }
}
```

Each real page (`LoginPage`, `DashboardPage`) extends it, and follows the same three
rules everywhere in this codebase:

1. **Locators are `private readonly` fields.** Nothing outside the class can reach a
   locator — no test ever writes `loginPage.usernameInput`.
2. **Every user-visible action is a `public async` method** with a name describing
   intent, not mechanics: `login(username, password)`, not `fillFormAndClick()`.
3. **`goto()` calls `super.goto(path)`** with that page's own route, so a test never
   hardcodes a URL.

```ts
// pages/LoginPage.ts
export class LoginPage extends BasePage {
  private readonly usernameInput = this.page.locator('#username');
  private readonly passwordInput = this.page.locator('#password');
  private readonly loginButton = this.page.locator('#login');

  async goto() { await super.goto('/login'); }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
```

`#username` / `#login` / `.dashboard` and the `https://example.com` baseURL
(`playwright.config.ts`) are placeholders — point `baseURL` at your real app and swap the
selectors before relying on these two specs.

### Adding a new page object

1. Create `pages/YourPage.ts`, `extends BasePage`.
2. Declare its locators as `private readonly` fields at the top of the class.
3. Add one `async` method per user action or assertion the page needs to support.
   Don't add a generic "click(locator)" helper — every method should describe *what*
   it does, not just wrap a Playwright API 1:1.
4. Register it in `fixtures/base.fixture.ts` (see the [Fixtures](#fixtures) section below)
   so tests get it by declaring `{ yourPage }` instead of writing `new YourPage(page)`
   themselves.
5. If several tests need the page in a pre-set state (e.g. already logged in, already
   on a specific tab), add a **composed fixture** the way `authenticatedDashboardPage`
   does it — see the Fixtures section.

---

## 2. AWS S3

**Files:** `config/awsConfig.ts`, `services/S3Service.ts` · **Test:** `tests/s3.spec.ts`

### What's here

`config/awsConfig.ts` reads four env vars and exposes `getAwsConfig()`. It does **not**
validate eagerly at import time — `required()` only runs when `getAwsConfig()` is
actually called, which only happens inside `S3Service`'s constructor, which only runs
when a test declares the `s3Service` fixture. That's why a test that never touches S3
still runs fine even with no AWS credentials configured at all.

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
```

`services/S3Service.ts` wraps the AWS SDK v3 `S3Client` behind three methods:
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

---

## 3. Azure Blob Storage

**Files:** `config/azureConfig.ts`, `services/BlobService.ts` · **Test:** `tests/blob.spec.ts`

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
content, don't write a second stream-reading helper.

---

## 4. API testing (chained/dependent calls)

**Files:** `config/apiConfig.ts`, `api/BaseApiClient.ts`, `api/ObjectApiClient.ts` ·
**Test:** `tests/api-object.spec.ts`

### What's here

`BaseApiClient` is one line on purpose — it just holds `protected readonly request:
APIRequestContext` so every API client shares the same constructor shape. This layer
exists to demonstrate **dependency chaining**: a sequence of calls where each step needs
data returned by a previous one.

```ts
// api/ObjectApiClient.ts
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

`API_BASE_URL` (in `config/apiConfig.ts`) defaults to `https://api.restful-api.dev`, a
free public test API with real (temporary) persistence, so this spec runs and passes with
zero setup.

### Adding a client for your own API

1. Create `api/YourResourceApiClient.ts`, `extends BaseApiClient`.
2. Give it a `private readonly basePath` for its endpoint.
3. One method per operation, each doing `this.request.<verb>(path, { data })`, checking
   `response.ok()` with `expect()`, then returning `response.json()` — copy the shape of
   `ObjectApiClient` exactly.
4. Export any request/response shapes as `type`s at the top of the file (see `TestObject`
   / `TestObjectPayload`), so callers get typed responses.
5. Point `API_BASE_URL` in `.env` at your real API.
6. Register the new client as a fixture (test-scoped, depending on `apiRequestContext`)
   in `fixtures/base.fixture.ts` — copy the `objectApiClient` fixture entry.

---

## 5. SQL database testing

**Files:** `config/dbConfig.ts`, `services/DbService.ts`, `repositories/BaseRepository.ts`,
`repositories/UserRepository.ts` · **Test:** `tests/db-user.spec.ts`

### What's here

This layer has two levels, and it's important to know which one to extend:

- **`services/DbService.ts`** is the *only* file that talks to `better-sqlite3` directly.
  It exposes generic, table-agnostic methods: `run(sql, params)`, `queryAll(sql, params)`,
  `queryOne(sql, params)`, `migrate()`, `close()`. It has no idea what a "user" is.
- **`repositories/UserRepository.ts`** is where table-specific knowledge lives. It
  `extends BaseRepository` (which just holds `protected readonly db: DbService`) and
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
2. Create `repositories/YourTableRepository.ts`, `extends BaseRepository`.
3. Export a `type` for the row shape (see `User` in `UserRepository.ts`).
4. Add one method per query the table needs — `this.db.run(...)` for
   inserts/updates/deletes, `this.db.queryOne<T>(...)` / `this.db.queryAll<T>(...)` for
   reads. Never build SQL by string-concatenating user input; always pass values through
   the `params` array like the existing methods do.
5. Register `yourTableRepository` as a test-scoped fixture in `fixtures/base.fixture.ts`,
   depending on `dbService` — copy the `userRepository` fixture entry.

### Swapping SQLite for a real server (Postgres / MySQL / SQL Server)

Only `services/DbService.ts` needs to change: swap `better-sqlite3` for `pg` / `mysql2` /
`mssql`, update `config/dbConfig.ts`'s env vars (host/port/user/password instead of a file
path), and keep the same `run` / `queryAll` / `queryOne` method signatures. Every
repository and every fixture stays exactly as it is.

---

## Fixtures

**File:** `fixtures/base.fixture.ts` — the one place everything above gets wired
together into a single `test` export that every spec imports instead of
`@playwright/test`'s own:

```ts
import { test } from '../fixtures/base.fixture';

test('...', async ({ loginPage, s3Service, objectApiClient, userRepository }) => {
  // whichever fixtures the test actually needs — Playwright only builds those
});
```

| Fixture | Scope | Built from | What it gives you |
|---|---|---|---|
| `loginPage` / `dashboardPage` | test | `new LoginPage(page)` / `new DashboardPage(page)` | Page objects bound to that test's `page` |
| `authenticatedDashboardPage` | test | `loginPage` + `dashboardPage` | `dashboardPage`, already logged in |
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
   object. Worker-scoped fixtures are written as a **tuple**:
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

**Folder:** `tests/` — one spec file per concern, named after what it tests
(`login.spec.ts`, `s3.spec.ts`, `db-user.spec.ts`, not `test1.spec.ts`). Every spec:

- Imports `test`/`expect` from `../fixtures/base.fixture`, **never** from
  `@playwright/test` directly — that's what makes the custom fixtures available.
- Declares only the fixtures it actually needs as parameters; Playwright only
  constructs those.
- Contains no raw locators, SDK calls, or SQL — if you find yourself writing
  `page.locator(...)` or `new S3Client(...)` inside a test file, that logic belongs in a
  page object / service / repository instead, with a fixture in front of it.

### Adding a new test

1. Decide which existing fixture(s) it needs, or add a new one first (see above).
2. Create `tests/your-thing.spec.ts`.
3. Write the test body purely in terms of the fixtures' methods — `await
   somePage.doSomething()`, `expect(await someService.checkSomething()).toBe(...)`.

---

## utils/

**File:** `utils/TestData.ts` — static, hand-written test data shared across specs (right
now, just the `users.admin` credentials used by the login/dashboard tests). Add new
constants here the same way, grouped by what they represent (e.g. add a `products`
export alongside `users` rather than creating a new file per constant).

---

## The env-loading pattern (`config/loadEnv.ts`)

Every `config/*.ts` file follows the same two rules — copy them when you add a new
integration's config file:

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
