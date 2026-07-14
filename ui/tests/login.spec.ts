import { test } from '../../fixtures/base.fixture';
import { users } from '../utils/Users';

test('Standard user can log in', async ({ loginPage, inventoryPage }) => {
  await loginPage.goto();
  await loginPage.login(users.standard.username, users.standard.password);
  await inventoryPage.verifyInventoryVisible();
  await inventoryPage.verifyURL(/inventory\.html/);
});

test('Locked out user sees a lockout error', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.lockedOut.username, users.lockedOut.password);
  await loginPage.verifyErrorMessage('Sorry, this user has been locked out.');
});

test('Invalid credentials show an error and do not log in', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('invalid_user', 'wrong_password');
  await loginPage.verifyErrorMessage('Username and password do not match any user in this service');
  await loginPage.verifyURL(/saucedemo\.com\/?$/);
});

test('Missing password shows a required-field error', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.standard.username, '');
  await loginPage.verifyErrorMessage('Password is required');
});
