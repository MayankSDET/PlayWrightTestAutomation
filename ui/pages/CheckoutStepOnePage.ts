import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutStepOnePage extends BasePage {
  private readonly firstNameInput = this.page.locator('#first-name');
  private readonly lastNameInput = this.page.locator('#last-name');
  private readonly postalCodeInput = this.page.locator('#postal-code');
  private readonly continueButton = this.page.locator('#continue');
  private readonly errorMessage = this.page.locator('[data-test="error"]');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/checkout-step-one.html');
  }

  async fillInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
  }

  async continueToOverview() {
    await this.continueButton.click();
  }

  async verifyErrorMessage(expectedMessage: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(expectedMessage);
  }
}
