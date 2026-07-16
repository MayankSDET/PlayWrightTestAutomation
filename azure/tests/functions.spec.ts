// Azure Functions: function app existence, invocation, and listing checks. Requires a real Azure account/key.
import { test, expect } from '../../fixtures/base.fixture';

// The configured function app is reported as present.
test('Verify the configured function app exists', async ({ functionsService }) => {
  const exists = await functionsService.functionAppExists();
  expect(exists).toBeTruthy();
});

// Invoking the function returns a successful status code.
test('Invoking the function returns a successful status code', async ({ functionsService }) => {
  const result = await functionsService.invoke({ sample: 'payload' });
  expect(result.statusCode).toBe(200);
});

// Listing functions in the app returns at least one function.
test('List functions returns at least one function', async ({ functionsService }) => {
  const functions = await functionsService.listFunctions();
  expect(functions.length).toBeGreaterThan(0);
});
