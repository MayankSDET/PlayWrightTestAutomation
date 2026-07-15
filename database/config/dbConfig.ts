import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';

loadEnv(path.resolve(__dirname, '../.env'));

export type DbConfig = {
  filePath: string;
};

export function getDbConfig(): DbConfig {
  return {
    filePath: process.env.DB_FILE_PATH || ':memory:',
  };
}
