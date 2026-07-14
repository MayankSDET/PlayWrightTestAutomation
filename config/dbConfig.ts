import { loadEnv } from './loadEnv';

loadEnv();

export type DbConfig = {
  filePath: string;
};

export function getDbConfig(): DbConfig {
  return {
    filePath: process.env.DB_FILE_PATH || ':memory:',
  };
}
