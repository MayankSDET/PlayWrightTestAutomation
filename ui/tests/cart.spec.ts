// Cart page: items carried over from inventory, removal, and "continue shopping" navigation.
import { test, expect } from '../../fixtures/base.fixture';
import { products } from '../utils/Products';

// Products added on the inventory page show up in the cart.
test('Cart reflects items added from the inventory page', async ({ authenticatedInventoryPage, cartPage }) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  await authenticatedInventoryPage.addProductToCart(products.bikeLight);

  await authenticatedInventoryPage.goToCart();

  const itemNames = await cartPage.getCartItemNames();
  expect(itemNames).toEqual(expect.arrayContaining([products.backpack, products.bikeLight]));
});

// Removing one item from the cart page leaves the others intact.
test('Removing an item from the cart page removes it from the list', async ({ authenticatedInventoryPage, cartPage }) => {
  await authenticatedInventoryPage.addProductToCart(products.backpack);
  await authenticatedInventoryPage.addProductToCart(products.bikeLight);
  await authenticatedInventoryPage.goToCart();

  await cartPage.removeItem(products.backpack);

  const itemNames = await cartPage.getCartItemNames();
  expect(itemNames).not.toContain(products.backpack);
  expect(itemNames).toContain(products.bikeLight);
});

// "Continue Shopping" from the cart navigates back to the inventory page.
test('Continue shopping returns to the inventory page', async ({ authenticatedInventoryPage, cartPage }) => {
  await authenticatedInventoryPage.goToCart();
  await cartPage.continueShopping();
  await authenticatedInventoryPage.verifyInventoryVisible();
});
