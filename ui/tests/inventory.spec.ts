import { test, expect } from '../../fixtures/base.fixture';
import { products } from '../utils/Products';

test('Inventory page lists products after login', async ({ authenticatedInventoryPage }) => {
  await authenticatedInventoryPage.verifyInventoryVisible();
  const names = await authenticatedInventoryPage.getProductNames();
  expect(names.length).toBeGreaterThan(0);
  expect(names).toContain(products.backpack);
});

test('Adding and removing a product updates the cart badge', async ({ authenticatedInventoryPage }) => {
  expect(await authenticatedInventoryPage.getCartItemCount()).toBe(0);

  await authenticatedInventoryPage.addProductToCart(products.backpack);
  expect(await authenticatedInventoryPage.getCartItemCount()).toBe(1);

  await authenticatedInventoryPage.addProductToCart(products.bikeLight);
  expect(await authenticatedInventoryPage.getCartItemCount()).toBe(2);

  await authenticatedInventoryPage.removeProductFromCart(products.backpack);
  expect(await authenticatedInventoryPage.getCartItemCount()).toBe(1);
});

test('Sorting by price low to high orders products ascending', async ({ authenticatedInventoryPage }) => {
  await authenticatedInventoryPage.sortBy('lohi');
  const prices = await authenticatedInventoryPage.getProductPrices();
  const sorted = [...prices].sort((a, b) => a - b);
  expect(prices).toEqual(sorted);
});

test('Sorting by name Z to A orders products descending', async ({ authenticatedInventoryPage }) => {
  await authenticatedInventoryPage.sortBy('za');
  const names = await authenticatedInventoryPage.getProductNames();
  const sorted = [...names].sort().reverse();
  expect(names).toEqual(sorted);
});
