import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';

loadEnv(path.resolve(__dirname, '../.env'));

export type ApiConfig = {
  baseURL: string;
  apiKey: string | null;
};

// api.restful-api.dev enforces a shared daily request quota per caller: 50/24h on the
// public tier, 100/24h once authenticated with a free API key. API_KEY is optional —
// unset, this domain still runs with zero setup, just against the lower public quota.
export function getApiConfig(): ApiConfig {
  return {
    baseURL: process.env.API_BASE_URL || 'https://api.restful-api.dev',
    apiKey: process.env.API_KEY || null,
  };
}
