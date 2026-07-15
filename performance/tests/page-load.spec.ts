// Page-load performance: navigation timing and Core Web Vitals budgets for key saucedemo.com pages.
import { test, expect } from '../../fixtures/base.fixture';
import { performanceThresholds } from '../config/performanceThresholds';

// Login page loads, paints, and settles its layout within budget.
test('Login page meets load-time and Web Vitals budgets', async ({ page, loginPage, performanceService }) => {
  await loginPage.goto();

  const timing = await performanceService.getNavigationTiming(page);
  const vitals = await performanceService.getWebVitals(page);
  const budget = performanceThresholds.login;

  expect(timing.domContentLoadedMs).toBeLessThan(budget.domContentLoadedMs);
  expect(timing.loadMs).toBeLessThan(budget.loadMs);
  if (vitals.lcpMs !== null) {
    expect(vitals.lcpMs).toBeLessThan(budget.lcpMs);
  }
  expect(vitals.cls).toBeLessThan(budget.cls);
});

// Inventory page (reached after login) loads, paints, and settles its layout within budget.
test('Inventory page meets load-time and Web Vitals budgets', async ({
  page,
  authenticatedInventoryPage,
  performanceService,
}) => {
  await authenticatedInventoryPage.verifyInventoryVisible();

  const timing = await performanceService.getNavigationTiming(page);
  const vitals = await performanceService.getWebVitals(page);
  const budget = performanceThresholds.inventory;

  expect(timing.domContentLoadedMs).toBeLessThan(budget.domContentLoadedMs);
  expect(timing.loadMs).toBeLessThan(budget.loadMs);
  if (vitals.lcpMs !== null) {
    expect(vitals.lcpMs).toBeLessThan(budget.lcpMs);
  }
  expect(vitals.cls).toBeLessThan(budget.cls);
});
