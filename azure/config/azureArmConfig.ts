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

export type AzureArmCredentials = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
  resourceGroupName: string;
};

// Shared by every Azure resource-management service's own config file (vnetConfig.ts,
// dnsConfig.ts, functionsConfig.ts, ...) so each only has to declare the resource-specific
// env var it additionally needs. Separate from azureConfig.ts's connection-string auth:
// Blob Storage (data plane) and resource management (control plane, via an AD app
// registration) use fundamentally different credentials in Azure.
export function getAzureArmCredentials(): AzureArmCredentials {
  return {
    tenantId: required('AZURE_TENANT_ID'),
    clientId: required('AZURE_CLIENT_ID'),
    clientSecret: required('AZURE_CLIENT_SECRET'),
    subscriptionId: required('AZURE_SUBSCRIPTION_ID'),
    resourceGroupName: required('AZURE_RESOURCE_GROUP'),
  };
}
