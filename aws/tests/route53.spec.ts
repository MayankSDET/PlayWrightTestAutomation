// AWS Route 53: hosted zone existence and record listing checks. Requires a real AWS account/key.
import { test, expect } from '../../fixtures/base.fixture';

// The configured hosted zone is reported as present.
test('Verify the configured hosted zone exists', async ({ route53Service }) => {
  const exists = await route53Service.hostedZoneExists();
  expect(exists).toBeTruthy();
});

// Listing record sets returns at least one record in the hosted zone.
test('List record sets returns at least one record', async ({ route53Service }) => {
  const names = await route53Service.listRecordNames();
  expect(names.length).toBeGreaterThan(0);
});
