import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutStepTwoPage extends BasePage {
  private readonly itemTotalLabel = this.page.locator('.summary_subtotal_label');
  private readonly taxLabel = this.page.locator('.summary_tax_label');
  private readonly totalLabel = this.page.locator('.summary_total_label');
  private readonly finishButton = this.page.locator('#finish');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/checkout-step-two.html');
  }

  async getItemNames(): Promise<string[]> {
    return this.page.locator('.inventory_item_name').allTextContents();
  }

  async getItemTotal(): Promise<number> {
    return this.extractAmount(await this.itemTotalLabel.textContent());
  }

  async getTax(): Promise<number> {
    return this.extractAmount(await this.taxLabel.textContent());
  }

  async getTotal(): Promise<number> {
    return this.extractAmount(await this.totalLabel.textContent());
  }

  async finish() {
    await this.finishButton.click();
  }

  private extractAmount(text: string | null): number {
    return Number((text ?? '').replace(/[^0-9.]/g, ''));
  }
}
