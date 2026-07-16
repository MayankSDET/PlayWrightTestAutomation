// AWS VPC: network existence and subnet listing checks. Requires a real AWS account/key.
import { test, expect } from '../../fixtures/base.fixture';

// The configured VPC is reported as present.
test('Verify the configured VPC exists', async ({ vpcService }) => {
  const exists = await vpcService.vpcExists();
  expect(exists).toBeTruthy();
});

// The VPC has a CIDR block assigned.
test('VPC has a CIDR block assigned', async ({ vpcService }) => {
  const cidrBlock = await vpcService.getCidrBlock();
  expect(cidrBlock).toBeTruthy();
});

// Listing subnets returns at least one subnet under the VPC.
test('List subnets returns at least one subnet', async ({ vpcService }) => {
  const subnetIds = await vpcService.listSubnetIds();
  expect(subnetIds.length).toBeGreaterThan(0);
});
