import { test as base, APIRequestContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { S3Service } from '../services/S3Service';
import { BlobService } from '../services/BlobService';
import { ObjectApiClient } from '../api/ObjectApiClient';
import { getApiConfig } from '../config/apiConfig';
import { users } from '../utils/TestData';
import { DbService } from '../services/DbService';
import { UserRepository } from '../repositories/UserRepository';

type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedDashboardPage: DashboardPage;
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

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  authenticatedDashboardPage: async ({ loginPage, dashboardPage }, use) => {
    await loginPage.goto();
    await loginPage.login(users.admin.username, users.admin.password);
    await use(dashboardPage);
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
