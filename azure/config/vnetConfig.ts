import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';
import { getAzureArmCredentials, AzureArmCredentials } from './azureArmConfig';

loadEnv(path.resolve(__dirname, '../.env'));

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

export type VNetConfig = AzureArmCredentials & {
  vnetName: string;
};

export function getVNetConfig(): VNetConfig {
  return {
    ...getAzureArmCredentials(),
    vnetName: required('AZURE_VNET_NAME'),
  };
}
