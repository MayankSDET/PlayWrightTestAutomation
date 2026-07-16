// AWS Lambda: function existence, invocation, and listing checks. Requires a real AWS account/key.
import { test, expect } from '../../fixtures/base.fixture';

// The configured function is reported as present.
test('Verify the configured Lambda function exists', async ({ lambdaService }) => {
  const exists = await lambdaService.functionExists();
  expect(exists).toBeTruthy();
});

// Invoking the function returns a successful status code.
test('Invoking the function returns a successful status code', async ({ lambdaService }) => {
  const result = await lambdaService.invoke({ sample: 'payload' });
  expect(result.statusCode).toBe(200);
});

// Listing functions in the account returns at least one function.
test('List functions returns at least one function', async ({ lambdaService }) => {
  const functions = await lambdaService.listFunctions();
  expect(functions.length).toBeGreaterThan(0);
});
