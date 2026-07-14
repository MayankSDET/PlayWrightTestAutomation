import { test } from '../fixtures/base.fixture';
import { users } from '../utils/TestData';

test('Login Test', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login(users.admin.username, users.admin.password);
});
