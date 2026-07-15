// Logout: signing out returns the user to the login screen.
import { test } from '../../fixtures/base.fixture';

// Logging out from the inventory page redirects back to the login URL.
test('Logout returns the user to the login page', async ({ authenticatedInventoryPage, loginPage }) => {
  await authenticatedInventoryPage.logout();
  await loginPage.verifyURL(/saucedemo\.com\/?$/);
});
