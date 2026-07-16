import { NetworkManagementClient } from '@azure/arm-network';
import { ClientSecretCredential } from '@azure/identity';
import { getVNetConfig } from '../config/vnetConfig';
import { isAzureNotFoundError } from './armErrors';

export class VNetService {
  private readonly client: NetworkManagementClient;
  private readonly resourceGroupName: string;
  private readonly vnetName: string;

  constructor(vnetName?: string) {
    const config = getVNetConfig();
    const credential = new ClientSecretCredential(config.tenantId, config.clientId, config.clientSecret);
    this.client = new NetworkManagementClient(credential, config.subscriptionId);
    this.resourceGroupName = config.resourceGroupName;
    this.vnetName = vnetName ?? config.vnetName;
  }

  async vnetExists(): Promise<boolean> {
    try {
      await this.client.virtualNetworks.get(this.resourceGroupName, this.vnetName);
      return true;
    } catch (error: unknown) {
      if (isAzureNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async getAddressSpace(): Promise<string[]> {
    const vnet = await this.client.virtualNetworks.get(this.resourceGroupName, this.vnetName);
    return vnet.addressSpace?.addressPrefixes ?? [];
  }

  async listSubnetNames(): Promise<string[]> {
    const names: string[] = [];
    for await (const subnet of this.client.subnets.list(this.resourceGroupName, this.vnetName)) {
      if (subnet.name) {
        names.push(subnet.name);
      }
    }
    return names;
  }
}
