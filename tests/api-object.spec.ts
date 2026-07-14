import { test, expect } from '../fixtures/base.fixture';

test('create -> get -> update -> delete: chained object lifecycle', async ({ objectApiClient }) => {
  const created = await objectApiClient.create({
    name: 'Playwright Dependency Test Object',
    data: { framework: 'playwright', scenario: 'chained-api-call' }
  });
  expect(created.id).toBeTruthy();

  const fetched = await objectApiClient.get(created.id);
  expect(fetched.name).toBe(created.name);

  const updated = await objectApiClient.update(created.id, {
    name: 'Playwright Dependency Test Object (Updated)',
    data: { framework: 'playwright', scenario: 'chained-api-call-updated' }
  });
  expect(updated.name).toContain('Updated');

  await objectApiClient.delete(created.id);

  expect(await objectApiClient.exists(created.id)).toBeFalsy();
});
