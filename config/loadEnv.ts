import * as dotenv from 'dotenv';
import * as path from 'path';

let loaded = false;

export function loadEnv(): void {
  if (loaded) {
    return;
  }
  dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  loaded = true;
}
