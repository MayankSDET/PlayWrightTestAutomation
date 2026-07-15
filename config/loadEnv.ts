import * as dotenv from 'dotenv';

const loadedPaths = new Set<string>();

export function loadEnv(envPath: string): void {
  if (loadedPaths.has(envPath)) {
    return;
  }
  dotenv.config({ path: envPath, quiet: true });
  loadedPaths.add(envPath);
}
