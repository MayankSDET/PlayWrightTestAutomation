// Reqres accounts API: user CRUD, registration, and login. Requires a real reqres API key.
import { test, expect } from '../../fixtures/base.fixture';
import { registration, login } from '../utils/ReqresCredentials';
import { newUser, updatedUser } from '../utils/ReqresUserPayloads';

// Listing page 2 returns that page number and a known first user id.
test('GET /api/users lists users on the requested page', async ({ userApiClient }) => {
  const page = await userApiClient.list(2);
  expect(page.page).toBe(2);
  expect(page.data.length).toBeGreaterThan(0);
  expect(page.data[0].id).toBe(7);
});

// Fetching a known user id returns that user's data.
test('GET /api/users/:id returns the matching user', async ({ userApiClient }) => {
  const { data } = await userApiClient.getById(2);
  expect(data.id).toBe(2);
});

// Fetching a nonexistent user id reports as not existing (404).
test('GET /api/users/:id returns 404 for a nonexistent user', async ({ userApiClient }) => {
  expect(await userApiClient.exists(23)).toBeFalsy();
});

// Creating a user echoes back the submitted name/job with a generated id and timestamp.
test('POST /api/users creates a user', async ({ userApiClient }) => {
  const created = await userApiClient.create(newUser);
  expect(created.name).toBe(newUser.name);
  expect(created.job).toBe(newUser.job);
  expect(created.id).toBeTruthy();
  expect(created.createdAt).toBeTruthy();
});

// Updating a user via PUT reflects the new name/job and an updated timestamp.
test('PUT /api/users/:id updates a user', async ({ userApiClient }) => {
  const updated = await userApiClient.update(2, updatedUser);
  expect(updated.name).toBe(updatedUser.name);
  expect(updated.job).toBe(updatedUser.job);
  expect(updated.updatedAt).toBeTruthy();
});

// Partially updating a user via PATCH changes only the given field.
test('PATCH /api/users/:id partially updates a user', async ({ userApiClient }) => {
  const updated = await userApiClient.partialUpdate(2, { job: updatedUser.job });
  expect(updated.job).toBe(updatedUser.job);
  expect(updated.updatedAt).toBeTruthy();
});

// Deleting a user succeeds without error.
test('DELETE /api/users/:id removes a user', async ({ userApiClient }) => {
  await userApiClient.delete(2);
});

// Registering with a valid email/password returns a 200 and an auth token.
test('POST /api/register succeeds with a valid email and password', async ({ userApiClient }) => {
  const result = await userApiClient.register(registration.valid);
  expect(result.status).toBe(200);
  expect((result.body as { token: string }).token).toBeTruthy();
});

// Registering without a password is rejected with a 400 and an error message.
test('POST /api/register fails without a password', async ({ userApiClient }) => {
  const result = await userApiClient.register(registration.missingPassword);
  expect(result.status).toBe(400);
  expect((result.body as { error: string }).error).toBe('Missing password');
});

// Logging in with a valid email/password returns a 200 and an auth token.
test('POST /api/login succeeds with a valid email and password', async ({ userApiClient }) => {
  const result = await userApiClient.login(login.valid);
  expect(result.status).toBe(200);
  expect((result.body as { token: string }).token).toBeTruthy();
});

// Logging in without a password is rejected with a 400 and an error message.
test('POST /api/login fails without a password', async ({ userApiClient }) => {
  const result = await userApiClient.login(login.missingPassword);
  expect(result.status).toBe(400);
  expect((result.body as { error: string }).error).toBe('Missing password');
});
