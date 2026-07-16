// Azure DNS: hosted zone existence and record listing checks. Requires a real Azure account/key.
import { test, expect } from '../../fixtures/base.fixture';

// The configured DNS zone is reported as present.
test('Verify the configured DNS zone exists', async ({ dnsService }) => {
  const exists = await dnsService.zoneExists();
  expect(exists).toBeTruthy();
});

// Listing record sets returns at least one record in the zone.
test('List record sets returns at least one record', async ({ dnsService }) => {
  const names = await dnsService.listRecordSetNames();
  expect(names.length).toBeGreaterThan(0);
});
