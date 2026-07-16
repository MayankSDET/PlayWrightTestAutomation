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

export type VpcConfig = AwsCredentials & {
  vpcId: string;
};

export function getVpcConfig(): VpcConfig {
  return {
    ...getAwsCredentials(),
    vpcId: required('AWS_VPC_ID'),
  };
}
