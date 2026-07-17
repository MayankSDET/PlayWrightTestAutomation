// Same login flow as ui/tests/login.spec.ts, run through Appium against a real mobile
// browser on an actual device/emulator instead of Playwright's own browser automation.
import { test, expect } from '../../fixtures/base.fixture';
import { users } from '../../ui/utils/Users';

test('Standard user can log in on a real device browser', async ({ authenticatedInventoryScreen }) => {
  expect(await authenticatedInventoryScreen.getTitleText()).toBe('Products');
});

test('Locked out user sees a lockout error', async ({ loginScreen }) => {
  await loginScreen.open();
  await loginScreen.login(users.lockedOut.username, users.lockedOut.password);

  expect(await loginScreen.getErrorMessage()).toContain('locked out');
});
