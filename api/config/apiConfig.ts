import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';

loadEnv(path.resolve(__dirname, '../.env'));

export type ApiConfig = {
  baseURL: string;
};

export function getApiConfig(): ApiConfig {
  return {
    baseURL: process.env.API_BASE_URL || 'https://api.restful-api.dev',
  };
}
