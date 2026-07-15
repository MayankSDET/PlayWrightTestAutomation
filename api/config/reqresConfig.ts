import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';

loadEnv(path.resolve(__dirname, '../.env'));

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your api/.env file.`);
  }
  return value;
}

export type ReqresConfig = {
  baseURL: string;
  apiKey: string;
};

export function getReqresConfig(): ReqresConfig {
  return {
    baseURL: process.env.REQRES_BASE_URL || 'https://reqres.in',
    apiKey: required('REQRES_API_KEY'),
  };
}
