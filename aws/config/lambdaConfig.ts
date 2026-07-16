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

export type LambdaConfig = AwsCredentials & {
  functionName: string;
};

export function getLambdaConfig(): LambdaConfig {
  return {
    ...getAwsCredentials(),
    functionName: required('AWS_LAMBDA_FUNCTION_NAME'),
  };
}
