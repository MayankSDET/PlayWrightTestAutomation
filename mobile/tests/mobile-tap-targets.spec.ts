// Accessibility audit: on a touch device, every button/link on these screens should be
// at least MIN_TAP_TARGET_PX square so a finger tap doesn't miss or hit the wrong control.
import { test, expect } from '../../fixtures/base.fixture';
import { MIN_TAP_TARGET_PX } from '../utils/TapTargets';

test('login screen controls meet the minimum tap target size', async ({ page, loginPage, mobileService }) => {
  await loginPage.goto();

  const undersized = await mobileService.findUndersizedTapTargets(page);
  expect(undersized, `Controls smaller than ${MIN_TAP_TARGET_PX}x${MIN_TAP_TARGET_PX}px: ${JSON.stringify(undersized)}`).toEqual([]);
});

test('inventory screen controls meet the minimum tap target size', async ({ authenticatedInventoryPage, page, mobileService }) => {
  const undersized = await mobileService.findUndersizedTapTargets(page);
  expect(undersized, `Controls smaller than ${MIN_TAP_TARGET_PX}x${MIN_TAP_TARGET_PX}px: ${JSON.stringify(undersized)}`).toEqual([]);
});
