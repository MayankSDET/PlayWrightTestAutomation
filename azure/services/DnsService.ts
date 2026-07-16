import { DnsManagementClient, RecordType } from '@azure/arm-dns';
import { ClientSecretCredential } from '@azure/identity';
import { getDnsConfig } from '../config/dnsConfig';
import { isAzureNotFoundError } from './armErrors';

export class DnsService {
  private readonly client: DnsManagementClient;
  private readonly resourceGroupName: string;
  private readonly zoneName: string;

  constructor(zoneName?: string) {
    const config = getDnsConfig();
    const credential = new ClientSecretCredential(config.tenantId, config.clientId, config.clientSecret);
    this.client = new DnsManagementClient(credential, config.subscriptionId);
    this.resourceGroupName = config.resourceGroupName;
    this.zoneName = zoneName ?? config.zoneName;
  }

  async zoneExists(): Promise<boolean> {
    try {
      await this.client.zones.get(this.resourceGroupName, this.zoneName);
      return true;
    } catch (error: unknown) {
      if (isAzureNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async listRecordSetNames(): Promise<string[]> {
    const names: string[] = [];
    for await (const recordSet of this.client.recordSets.listAllByDnsZone(this.resourceGroupName, this.zoneName)) {
      if (recordSet.name) {
        names.push(recordSet.name);
      }
    }
    return names;
  }

  async recordExists(name: string, recordType: RecordType): Promise<boolean> {
    try {
      await this.client.recordSets.get(this.resourceGroupName, this.zoneName, name, recordType);
      return true;
    } catch (error: unknown) {
      if (isAzureNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }
}
