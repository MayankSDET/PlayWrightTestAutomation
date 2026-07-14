import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  private readonly cartItems = this.page.locator('.cart_item');
  private readonly checkoutButton = this.page.locator('#checkout');
  private readonly continueShoppingButton = this.page.locator('#continue-shopping');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/cart.html');
  }

  async getCartItemNames(): Promise<string[]> {
    return this.cartItems.locator('.inventory_item_name').allTextContents();
  }

  async verifyItemInCart(productName: string) {
    await expect(this.cartItems.filter({ hasText: productName })).toBeVisible();
  }

  async removeItem(productName: string) {
    await this.cartItems.filter({ hasText: productName }).getByRole('button', { name: 'Remove' }).click();
  }

  async checkout() {
    await this.checkoutButton.click();
  }

  async continueShopping() {
    await this.continueShoppingButton.click();
  }
}
