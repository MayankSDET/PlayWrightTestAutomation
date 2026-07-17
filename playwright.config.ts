import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/tests/**/*.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['html'], ['./reporters/FriendlyReporter.ts'], ['./reporters/ComponentDashboardReporter.ts']],
  use: {
    baseURL: 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: 'mobile/tests/**',
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: 'mobile/tests/**/*.spec.ts',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      testMatch: 'mobile/tests/**/*.spec.ts',
    },
  ],
});
