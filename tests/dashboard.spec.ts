import { test } from '../fixtures/base.fixture';

test('Dashboard Validation', async ({ authenticatedDashboardPage }) => {
  await authenticatedDashboardPage.verifyDashboardVisible();
});
