import { test as base, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../ui/pages/LoginPage';
import { InventoryPage } from '../ui/pages/InventoryPage';
import { CartPage } from '../ui/pages/CartPage';
import { CheckoutStepOnePage } from '../ui/pages/CheckoutStepOnePage';
import { CheckoutStepTwoPage } from '../ui/pages/CheckoutStepTwoPage';
import { CheckoutCompletePage } from '../ui/pages/CheckoutCompletePage';
import { S3Service } from '../aws/services/S3Service';
import { BlobService } from '../azure/services/BlobService';
import { ObjectApiClient } from '../api/clients/ObjectApiClient';
import { getApiConfig } from '../api/config/apiConfig';
import { users } from '../ui/utils/Users';
import { DbService } from '../database/services/DbService';
import { UserRepository } from '../database/repositories/UserRepository';

type TestFixtures = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  authenticatedInventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutStepOnePage: CheckoutStepOnePage;
  checkoutStepTwoPage: CheckoutStepTwoPage;
  checkoutCompletePage: CheckoutCompletePage;
  objectApiClient: ObjectApiClient;
  userRepository: UserRepository;
};

type WorkerFixtures = {
  s3Service: S3Service;
  blobService: BlobService;
  apiRequestContext: APIRequestContext;
  dbService: DbService;
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

  blobService: [async ({}, use) => {
    await use(new BlobService());
  }, { scope: 'worker' }],

  apiRequestContext: [async ({ playwright }, use) => {
    const context = await playwright.request.newContext({ baseURL: getApiConfig().baseURL });
    await use(context);
    await context.dispose();
  }, { scope: 'worker' }],

  objectApiClient: async ({ apiRequestContext }, use) => {
    await use(new ObjectApiClient(apiRequestContext));
  },

  dbService: [async ({}, use) => {
    const dbService = new DbService();
    dbService.migrate();
    await use(dbService);
    dbService.close();
  }, { scope: 'worker' }],

  userRepository: async ({ dbService }, use) => {
    await use(new UserRepository(dbService));
  }
});

export { expect } from '@playwright/test';
