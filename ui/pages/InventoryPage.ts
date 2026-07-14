import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type SortOption = 'az' | 'za' | 'lohi' | 'hifi';

export class InventoryPage extends BasePage {
  private readonly pageTitle = this.page.locator('.title');
  private readonly inventoryItems = this.page.locator('.inventory_item');
  private readonly sortDropdown = this.page.locator('[data-test="product-sort-container"]');
  private readonly cartBadge = this.page.locator('.shopping_cart_badge');
  private readonly cartLink = this.page.locator('.shopping_cart_link');
  private readonly burgerMenuButton = this.page.locator('#react-burger-menu-btn');
  private readonly logoutLink = this.page.locator('#logout_sidebar_link');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/inventory.html');
  }

  async verifyInventoryVisible() {
    await expect(this.pageTitle).toHaveText('Products');
  }

  private itemRow(productName: string) {
    return this.inventoryItems.filter({ hasText: productName });
  }

  async addProductToCart(productName: string) {
    await this.itemRow(productName).getByRole('button', { name: 'Add to cart' }).click();
  }

  async removeProductFromCart(productName: string) {
    await this.itemRow(productName).getByRole('button', { name: 'Remove' }).click();
  }

  async getCartItemCount(): Promise<number> {
    if (!(await this.cartBadge.isVisible())) {
      return 0;
    }
    return Number(await this.cartBadge.textContent());
  }

  async sortBy(option: SortOption) {
    await this.sortDropdown.selectOption(option);
  }

  async getProductNames(): Promise<string[]> {
    return this.page.locator('.inventory_item_name').allTextContents();
  }

  async getProductPrices(): Promise<number[]> {
    const priceTexts = await this.page.locator('.inventory_item_price').allTextContents();
    return priceTexts.map((price) => Number(price.replace('$', '')));
  }

  async goToCart() {
    await this.cartLink.click();
  }

  async logout() {
    await this.burgerMenuButton.click();
    await this.logoutLink.click();
  }
}
