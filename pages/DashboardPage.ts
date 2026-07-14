import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly dashboardHeader = this.page.locator('.dashboard');

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/dashboard');
  }

  async verifyDashboardVisible() {
    await expect(this.dashboardHeader).toBeVisible();
  }
}
