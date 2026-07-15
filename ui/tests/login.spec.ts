// Login page: valid/invalid credential handling and field validation.
import { test } from '../../fixtures/base.fixture';
import { users } from '../utils/Users';

// Standard credentials log in successfully and land on the inventory page.
test('Standard user can log in', async ({ loginPage, inventoryPage }) => {
  await loginPage.goto();
  await loginPage.login(users.standard.username, users.standard.password);
  await inventoryPage.verifyInventoryVisible();
  await inventoryPage.verifyURL(/inventory\.html/);
});

// A locked-out account is rejected with the lockout error message.
test('Locked out user sees a lockout error', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.lockedOut.username, users.lockedOut.password);
  await loginPage.verifyErrorMessage('Sorry, this user has been locked out.');
});

// Wrong username/password combination is rejected and stays on the login page.
test('Invalid credentials show an error and do not log in', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('invalid_user', 'wrong_password');
  await loginPage.verifyErrorMessage('Username and password do not match any user in this service');
  await loginPage.verifyURL(/saucedemo\.com\/?$/);
});

// Submitting without a password shows a required-field error.
test('Missing password shows a required-field error', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.standard.username, '');
  await loginPage.verifyErrorMessage('Password is required');
});
