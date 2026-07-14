import { test } from '../../fixtures/base.fixture';

test('Logout returns the user to the login page', async ({ authenticatedInventoryPage, loginPage }) => {
  await authenticatedInventoryPage.logout();
  await loginPage.verifyURL(/saucedemo\.com\/?$/);
});
