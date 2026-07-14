import { test, expect } from '../../fixtures/base.fixture';
import { checkoutInfo } from '../utils/CheckoutData';
import { products } from '../utils/Products';

test('End-to-end checkout: browse -> cart -> checkout -> confirmation', async ({
  authenticatedInventoryPage,
  cartPage,
  checkoutStepOnePage,
  checkoutStepTwoPage,
  checkoutCompletePage,
}) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  await authenticatedInventoryPage.addProductToCart(products.bikeLight);
  expect(await authenticatedInventoryPage.getCartItemCount()).toBe(2);

  await authenticatedInventoryPage.goToCart();
  await cartPage.verifyItemInCart(products.backpack);
  await cartPage.verifyItemInCart(products.bikeLight);

  await cartPage.checkout();
  await checkoutStepOnePage.fillInfo(checkoutInfo.firstName, checkoutInfo.lastName, checkoutInfo.postalCode);
  await checkoutStepOnePage.continueToOverview();

  const overviewItems = await checkoutStepTwoPage.getItemNames();
  expect(overviewItems).toEqual(expect.arrayContaining([products.backpack, products.bikeLight]));

  const itemTotal = await checkoutStepTwoPage.getItemTotal();
  const tax = await checkoutStepTwoPage.getTax();
  const total = await checkoutStepTwoPage.getTotal();
  expect(total).toBeCloseTo(itemTotal + tax, 2);

  await checkoutStepTwoPage.finish();
  await checkoutCompletePage.verifyOrderComplete();
});

test('Checkout requires customer information before continuing', async ({
  authenticatedInventoryPage,
  cartPage,
  checkoutStepOnePage,
}) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  await authenticatedInventoryPage.goToCart();
  await cartPage.checkout();

  await checkoutStepOnePage.continueToOverview();
  await checkoutStepOnePage.verifyErrorMessage('First Name is required');
});
