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

export type FunctionsConfig = AzureArmCredentials & {
  functionAppName: string;
  functionUrl: string;
  functionKey: string;
};

export function getFunctionsConfig(): FunctionsConfig {
  return {
    ...getAzureArmCredentials(),
    functionAppName: required('AZURE_FUNCTION_APP_NAME'),
    functionUrl: required('AZURE_FUNCTION_URL'),
    functionKey: required('AZURE_FUNCTION_KEY'),
  };
}
