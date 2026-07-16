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

export type AwsCredentials = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

// Shared by every AWS service's own config file (lambdaConfig.ts, vpcConfig.ts, route53Config.ts, ...)
// so each only has to declare the resource-specific env var it additionally needs.
export function getAwsCredentials(): AwsCredentials {
  return {
    region: required('AWS_REGION'),
    accessKeyId: required('AWS_ACCESS_KEY_ID'),
    secretAccessKey: required('AWS_SECRET_ACCESS_KEY'),
  };
}

export type AwsConfig = AwsCredentials & {
  bucketName: string;
};

export function getAwsConfig(): AwsConfig {
  return {
    ...getAwsCredentials(),
    bucketName: required('AWS_S3_BUCKET_NAME'),
  };
}
