// Same end-to-end journey as ui/tests/checkout.spec.ts, run under mobile device
// emulation (see playwright.config.ts) as a responsive-layout regression guard.
import { test, expect } from '../../fixtures/base.fixture';
import { checkoutInfo } from '../../ui/utils/CheckoutData';
import { products } from '../../ui/utils/Products';

test('completes login -> add to cart -> checkout on a mobile viewport', async ({
  authenticatedInventoryPage,
  cartPage,
  checkoutStepOnePage,
  checkoutStepTwoPage,
  checkoutCompletePage,
}) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  expect(await authenticatedInventoryPage.getCartItemCount()).toBe(1);

  await authenticatedInventoryPage.goToCart();
  await cartPage.verifyItemInCart(products.backpack);

  await cartPage.checkout();
  await checkoutStepOnePage.fillInfo(checkoutInfo.firstName, checkoutInfo.lastName, checkoutInfo.postalCode);
  await checkoutStepOnePage.continueToOverview();

  const total = await checkoutStepTwoPage.getTotal();
  const itemTotal = await checkoutStepTwoPage.getItemTotal();
  const tax = await checkoutStepTwoPage.getTax();
  expect(total).toBeCloseTo(itemTotal + tax, 2);

  await checkoutStepTwoPage.finish();
  await checkoutCompletePage.verifyOrderComplete();
});
