import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutCompletePage extends BasePage {
  private readonly completeHeader = this.page.locator('.complete-header');
  private readonly backToProductsButton = this.page.locator('#back-to-products');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/checkout-complete.html');
  }

  async verifyOrderComplete() {
    await expect(this.completeHeader).toHaveText('Thank you for your order!');
  }

  async backToProducts() {
    await this.backToProductsButton.click();
  }
}
