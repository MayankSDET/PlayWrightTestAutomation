// Sanity checks that the mobile device emulation from playwright.config.ts is actually
// active — a phone-sized viewport and touch input, not a desktop browser in disguise.
import { test, expect } from '../../fixtures/base.fixture';

test('login screen renders at a phone-sized viewport', async ({ page, loginPage, mobileService }) => {
  await loginPage.goto();

  const viewport = await mobileService.getViewportSize(page);
  expect(viewport).not.toBeNull();
  expect(viewport!.width).toBeLessThanOrEqual(430);
});

test('touch input is enabled on the emulated device', async ({ page, loginPage, mobileService }) => {
  await loginPage.goto();

  expect(await mobileService.isTouchEnabled(page)).toBeTruthy();
});
