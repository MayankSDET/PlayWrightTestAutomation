import { test, expect } from '../../fixtures/base.fixture';
import { products } from '../utils/Products';

test('Cart reflects items added from the inventory page', async ({ authenticatedInventoryPage, cartPage }) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  await authenticatedInventoryPage.addProductToCart(products.bikeLight);

  await authenticatedInventoryPage.goToCart();

  const itemNames = await cartPage.getCartItemNames();
  expect(itemNames).toEqual(expect.arrayContaining([products.backpack, products.bikeLight]));
});

test('Removing an item from the cart page removes it from the list', async ({ authenticatedInventoryPage, cartPage }) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  await authenticatedInventoryPage.addProductToCart(products.bikeLight);
  await authenticatedInventoryPage.goToCart();

  await cartPage.removeItem(products.backpack);

  const itemNames = await cartPage.getCartItemNames();
  expect(itemNames).not.toContain(products.backpack);
  expect(itemNames).toContain(products.bikeLight);
});

test('Continue shopping returns to the inventory page', async ({ authenticatedInventoryPage, cartPage }) => {
  await authenticatedInventoryPage.goToCart();
  await cartPage.continueShopping();
  await authenticatedInventoryPage.verifyInventoryVisible();
});
