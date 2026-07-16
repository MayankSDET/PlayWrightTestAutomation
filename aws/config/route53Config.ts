import * as path from 'path';
import { loadEnv } from '../../config/loadEnv';
import { getAwsCredentials, AwsCredentials } from './awsConfig';

loadEnv(path.resolve(__dirname, '../.env'));

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

export type Route53Config = AwsCredentials & {
  hostedZoneId: string;
};

export function getRoute53Config(): Route53Config {
  return {
    ...getAwsCredentials(),
    hostedZoneId: required('AWS_HOSTED_ZONE_ID'),
  };
}
