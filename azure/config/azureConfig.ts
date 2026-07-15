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

export type AzureConfig = {
  connectionString: string;
  containerName: string;
};

export function getAzureConfig(): AzureConfig {
  return {
    connectionString: required('AZURE_STORAGE_CONNECTION_STRING'),
    containerName: required('AZURE_STORAGE_CONTAINER_NAME'),
  };
}
