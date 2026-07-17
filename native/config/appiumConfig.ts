import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';

loadEnv(path.resolve(__dirname, '../.env'));

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

export type AppiumConfig = {
  serverUrl: string;
  platformName: string;
  automationName: string;
  deviceName: string;
  platformVersion?: string;
  browserName: string;
};

// This domain drives a real mobile browser (Chrome on Android, Safari on iOS) on an
// actual device/emulator/simulator through Appium's WebDriver protocol — not Playwright's
// own browser automation (see mobile/, which emulates a phone viewport in a desktop
// browser instead). Appium server + a booted device are external prerequisites this
// config can't provision, the same way aws/azure need a real cloud account.
export function getAppiumConfig(): AppiumConfig {
  return {
    serverUrl: process.env.APPIUM_SERVER_URL || 'http://127.0.0.1:4723',
    platformName: required('APPIUM_PLATFORM_NAME'),
    automationName: required('APPIUM_AUTOMATION_NAME'),
    deviceName: required('APPIUM_DEVICE_NAME'),
    platformVersion: process.env.APPIUM_PLATFORM_VERSION || undefined,
    browserName: required('APPIUM_BROWSER_NAME'),
  };
}
