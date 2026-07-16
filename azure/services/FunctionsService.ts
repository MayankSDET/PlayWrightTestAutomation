import { WebSiteManagementClient } from '@azure/arm-appservice';
import { ClientSecretCredential } from '@azure/identity';
import { getFunctionsConfig } from '../config/functionsConfig';
import { isAzureNotFoundError } from './armErrors';

export type InvokeResult = {
  statusCode: number;
  payload: unknown;
};

export class FunctionsService {
  private readonly client: WebSiteManagementClient;
  private readonly resourceGroupName: string;
  private readonly functionAppName: string;
  private readonly functionUrl: string;
  private readonly functionKey: string;

  constructor(functionAppName?: string) {
    const config = getFunctionsConfig();
    const credential = new ClientSecretCredential(config.tenantId, config.clientId, config.clientSecret);
    this.client = new WebSiteManagementClient(credential, config.subscriptionId);
    this.resourceGroupName = config.resourceGroupName;
    this.functionAppName = functionAppName ?? config.functionAppName;
    this.functionUrl = config.functionUrl;
    this.functionKey = config.functionKey;
  }

  async functionAppExists(): Promise<boolean> {
    try {
      await this.client.webApps.get(this.resourceGroupName, this.functionAppName);
      return true;
    } catch (error: unknown) {
      if (isAzureNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async listFunctions(): Promise<string[]> {
    const names: string[] = [];
    for await (const fn of this.client.webApps.listFunctions(this.resourceGroupName, this.functionAppName)) {
      if (fn.name) {
        names.push(fn.name);
      }
    }
    return names;
  }

  // Function apps are invoked over HTTP, not through the management API — the ARM client
  // above only manages the resource (exists/list), same division as S3Service using the
  // data-plane S3Client while a hypothetical bucket-policy check would use a different client.
  async invoke(payload: unknown): Promise<InvokeResult> {
    const response = await fetch(this.functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': this.functionKey,
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    return {
      statusCode: response.status,
      payload: raw ? JSON.parse(raw) : null,
    };
  }
}
