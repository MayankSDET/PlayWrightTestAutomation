import { loadEnv } from './loadEnv';

loadEnv();

export type ApiConfig = {
  baseURL: string;
};

export function getApiConfig(): ApiConfig {
  return {
    baseURL: process.env.API_BASE_URL || 'https://api.restful-api.dev',
  };
}
