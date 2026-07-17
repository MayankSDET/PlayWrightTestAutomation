import type { Browser } from 'webdriverio';
import { BaseScreen } from './BaseScreen';

export class LoginScreen extends BaseScreen {
  private readonly usernameInput = this.driver.$('#user-name');
  private readonly passwordInput = this.driver.$('#password');
  private readonly loginButton = this.driver.$('#login-button');
  private readonly errorMessage = this.driver.$('[data-test="error"]');

  constructor(driver: Browser) {
    super(driver);
  }

  async open() {
    await super.open('https://www.saucedemo.com/');
  }

  async login(username: string, password: string) {
    await this.usernameInput.setValue(username);
    await this.passwordInput.setValue(password);
    await this.loginButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return this.errorMessage.getText();
  }
}
