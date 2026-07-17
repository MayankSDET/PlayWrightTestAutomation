import type { Browser } from 'webdriverio';
import { BaseScreen } from './BaseScreen';

export class InventoryScreen extends BaseScreen {
  private readonly pageTitle = this.driver.$('.title');
  private readonly inventoryItems = this.driver.$$('.inventory_item');
  private readonly cartBadge = this.driver.$('.shopping_cart_badge');

  constructor(driver: Browser) {
    super(driver);
  }

  async getTitleText(): Promise<string> {
    return this.pageTitle.getText();
  }

  async getProductCount(): Promise<number> {
    return (await this.inventoryItems).length;
  }

  async getCartItemCount(): Promise<number> {
    if (!(await this.cartBadge.isExisting())) {
      return 0;
    }
    return Number(await this.cartBadge.getText());
  }
}
