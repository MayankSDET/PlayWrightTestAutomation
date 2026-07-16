import { test as base, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../ui/pages/LoginPage';
import { InventoryPage } from '../ui/pages/InventoryPage';
import { CartPage } from '../ui/pages/CartPage';
import { CheckoutStepOnePage } from '../ui/pages/CheckoutStepOnePage';
import { CheckoutStepTwoPage } from '../ui/pages/CheckoutStepTwoPage';
import { CheckoutCompletePage } from '../ui/pages/CheckoutCompletePage';
import { S3Service } from '../aws/services/S3Service';
import { LambdaService } from '../aws/services/LambdaService';
import { VpcService } from '../aws/services/VpcService';
import { Route53Service } from '../aws/services/Route53Service';
import { BlobService } from '../azure/services/BlobService';
import { VNetService } from '../azure/services/VNetService';
import { DnsService } from '../azure/services/DnsService';
import { FunctionsService } from '../azure/services/FunctionsService';
import { ObjectApiClient } from '../api/clients/ObjectApiClient';
import { UserApiClient } from '../api/clients/UserApiClient';
import { getApiConfig } from '../api/config/apiConfig';
import { getReqresConfig } from '../api/config/reqresConfig';
import { users } from '../ui/utils/Users';
import { DbService } from '../database/services/DbService';
import { UserRepository } from '../database/repositories/UserRepository';
import { PerformanceService } from '../performance/services/PerformanceService';

type TestFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  authenticatedInventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutStepOnePage: CheckoutStepOnePage;
  checkoutStepTwoPage: CheckoutStepTwoPage;
  checkoutCompletePage: CheckoutCompletePage;
  objectApiClient: ObjectApiClient;
  userApiClient: UserApiClient;
  userRepository: UserRepository;
};

type WorkerFixtures = {
  s3Service: S3Service;
  lambdaService: LambdaService;
  vpcService: VpcService;
  route53Service: Route53Service;
  blobService: BlobService;
  vnetService: VNetService;
  dnsService: DnsService;
  functionsService: FunctionsService;
  apiRequestContext: APIRequestContext;
  reqresRequestContext: APIRequestContext;
  dbService: DbService;
  performanceService: PerformanceService;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },

  authenticatedInventoryPage: async ({ loginPage, inventoryPage }, use) => {
    await loginPage.goto();
    await loginPage.login(users.standard.username, users.standard.password);
    await use(inventoryPage);
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  checkoutStepOnePage: async ({ page }, use) => {
    await use(new CheckoutStepOnePage(page));
  },

  checkoutStepTwoPage: async ({ page }, use) => {
    await use(new CheckoutStepTwoPage(page));
  },

  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },

  s3Service: [async ({}, use) => {
    await use(new S3Service());
  }, { scope: 'worker' }],

  lambdaService: [async ({}, use) => {
    await use(new LambdaService());
  }, { scope: 'worker' }],

  vpcService: [async ({}, use) => {
    await use(new VpcService());
  }, { scope: 'worker' }],

  route53Service: [async ({}, use) => {
    await use(new Route53Service());
  }, { scope: 'worker' }],

  blobService: [async ({}, use) => {
    await use(new BlobService());
  }, { scope: 'worker' }],

  vnetService: [async ({}, use) => {
    await use(new VNetService());
  }, { scope: 'worker' }],

  dnsService: [async ({}, use) => {
    await use(new DnsService());
  }, { scope: 'worker' }],

  functionsService: [async ({}, use) => {
    await use(new FunctionsService());
  }, { scope: 'worker' }],

  apiRequestContext: [async ({ playwright }, use) => {
    const config = getApiConfig();
    const context = await playwright.request.newContext({
      baseURL: config.baseURL,
      extraHTTPHeaders: config.apiKey ? { 'x-api-key': config.apiKey } : undefined,
    });
    await use(context);
    await context.dispose();
  }, { scope: 'worker' }],

  objectApiClient: async ({ apiRequestContext }, use) => {
    await use(new ObjectApiClient(apiRequestContext));
  },

  reqresRequestContext: [async ({ playwright }, use) => {
    const config = getReqresConfig();
    const context = await playwright.request.newContext({
      baseURL: config.baseURL,
      extraHTTPHeaders: { 'x-api-key': config.apiKey },
    });
    await use(context);
    await context.dispose();
  }, { scope: 'worker' }],

  userApiClient: async ({ reqresRequestContext }, use) => {
    await use(new UserApiClient(reqresRequestContext));
  },

  dbService: [async ({}, use) => {
    const dbService = new DbService();
    dbService.migrate();
    await use(dbService);
    dbService.close();
  }, { scope: 'worker' }],

  userRepository: async ({ dbService }, use) => {
    await use(new UserRepository(dbService));
  },

  performanceService: [async ({}, use) => {
    await use(new PerformanceService());
  }, { scope: 'worker' }],
});

export { expect } from '@playwright/test';
