import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand } from '@aws-sdk/client-ec2';
import { getVpcConfig } from '../config/vpcConfig';

export class VpcService {
  private readonly client: EC2Client;
  private readonly vpcId: string;

  constructor(vpcId?: string) {
    const config = getVpcConfig();
    this.client = new EC2Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.vpcId = vpcId ?? config.vpcId;
  }

  async vpcExists(): Promise<boolean> {
    try {
      const result = await this.client.send(new DescribeVpcsCommand({ VpcIds: [this.vpcId] }));
      return (result.Vpcs ?? []).length > 0;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'InvalidVpcID.NotFound') {
        return false;
      }
      throw error;
    }
  }

  async getCidrBlock(): Promise<string | undefined> {
    const result = await this.client.send(new DescribeVpcsCommand({ VpcIds: [this.vpcId] }));
    return result.Vpcs?.[0]?.CidrBlock;
  }

  async listSubnetIds(): Promise<string[]> {
    const result = await this.client.send(
      new DescribeSubnetsCommand({
        Filters: [{ Name: 'vpc-id', Values: [this.vpcId] }],
      })
    );
    return (result.Subnets ?? [])
      .map((subnet) => subnet.SubnetId)
      .filter((id): id is string => Boolean(id));
  }
}
