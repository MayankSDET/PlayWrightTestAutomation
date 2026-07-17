import type { Browser } from 'webdriverio';

export abstract class BaseScreen {
  protected readonly driver: Browser;

  constructor(driver: Browser) {
    this.driver = driver;
  }

  async open(url: string) {
    await this.driver.url(url);
  }

  async getTitle(): Promise<string> {
    return this.driver.getTitle();
  }
}
