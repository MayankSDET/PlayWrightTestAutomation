// Azure Virtual Network (VNet): network existence and subnet listing checks. Requires a real Azure account/key.
import { test, expect } from '../../fixtures/base.fixture';

// The configured VNet is reported as present.
test('Verify the configured VNet exists', async ({ vnetService }) => {
  const exists = await vnetService.vnetExists();
  expect(exists).toBeTruthy();
});

// The VNet has an address space assigned.
test('VNet has an address space assigned', async ({ vnetService }) => {
  const addressSpace = await vnetService.getAddressSpace();
  expect(addressSpace.length).toBeGreaterThan(0);
});

// Listing subnets returns at least one subnet under the VNet.
test('List subnets returns at least one subnet', async ({ vnetService }) => {
  const subnetNames = await vnetService.listSubnetNames();
  expect(subnetNames.length).toBeGreaterThan(0);
});
