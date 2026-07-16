import {
  Route53Client,
  GetHostedZoneCommand,
  ListResourceRecordSetsCommand,
  NoSuchHostedZone,
} from '@aws-sdk/client-route-53';
import { getRoute53Config } from '../config/route53Config';

export class Route53Service {
  private readonly client: Route53Client;
  private readonly hostedZoneId: string;

  constructor(hostedZoneId?: string) {
    const config = getRoute53Config();
    this.client = new Route53Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.hostedZoneId = hostedZoneId ?? config.hostedZoneId;
  }

  async hostedZoneExists(): Promise<boolean> {
    try {
      await this.client.send(new GetHostedZoneCommand({ Id: this.hostedZoneId }));
      return true;
    } catch (error: unknown) {
      if (error instanceof NoSuchHostedZone) {
        return false;
      }
      throw error;
    }
  }

  async listRecordNames(): Promise<string[]> {
    const result = await this.client.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: this.hostedZoneId })
    );
    return (result.ResourceRecordSets ?? [])
      .map((record) => record.Name)
      .filter((name): name is string => Boolean(name));
  }

  async recordExists(name: string, type: string): Promise<boolean> {
    const result = await this.client.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: this.hostedZoneId })
    );
    return (result.ResourceRecordSets ?? []).some(
      (record) => record.Name === name && record.Type === type
    );
  }
}
