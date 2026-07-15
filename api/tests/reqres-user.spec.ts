import { test, expect } from '../../fixtures/base.fixture';
import { registration, login } from '../utils/ReqresCredentials';
import { newUser, updatedUser } from '../utils/ReqresUserPayloads';

test('GET /api/users lists users on the requested page', async ({ userApiClient }) => {
  const page = await userApiClient.list(2);
  expect(page.page).toBe(2);
  expect(page.data.length).toBeGreaterThan(0);
  expect(page.data[0].id).toBe(7);
});

test('GET /api/users/:id returns the matching user', async ({ userApiClient }) => {
  const { data } = await userApiClient.getById(2);
  expect(data.id).toBe(2);
});

test('GET /api/users/:id returns 404 for a nonexistent user', async ({ userApiClient }) => {
  expect(await userApiClient.exists(23)).toBeFalsy();
});

test('POST /api/users creates a user', async ({ userApiClient }) => {
  const created = await userApiClient.create(newUser);
  expect(created.name).toBe(newUser.name);
  expect(created.job).toBe(newUser.job);
  expect(created.id).toBeTruthy();
  expect(created.createdAt).toBeTruthy();
});

test('PUT /api/users/:id updates a user', async ({ userApiClient }) => {
  const updated = await userApiClient.update(2, updatedUser);
  expect(updated.name).toBe(updatedUser.name);
  expect(updated.job).toBe(updatedUser.job);
  expect(updated.updatedAt).toBeTruthy();
});

test('PATCH /api/users/:id partially updates a user', async ({ userApiClient }) => {
  const updated = await userApiClient.partialUpdate(2, { job: updatedUser.job });
  expect(updated.job).toBe(updatedUser.job);
  expect(updated.updatedAt).toBeTruthy();
});

test('DELETE /api/users/:id removes a user', async ({ userApiClient }) => {
  await userApiClient.delete(2);
});

test('POST /api/register succeeds with a valid email and password', async ({ userApiClient }) => {
  const result = await userApiClient.register(registration.valid);
  expect(result.status).toBe(200);
  expect((result.body as { token: string }).token).toBeTruthy();
});

test('POST /api/register fails without a password', async ({ userApiClient }) => {
  const result = await userApiClient.register(registration.missingPassword);
  expect(result.status).toBe(400);
  expect((result.body as { error: string }).error).toBe('Missing password');
});

test('POST /api/login succeeds with a valid email and password', async ({ userApiClient }) => {
  const result = await userApiClient.login(login.valid);
  expect(result.status).toBe(200);
  expect((result.body as { token: string }).token).toBeTruthy();
});

test('POST /api/login fails without a password', async ({ userApiClient }) => {
  const result = await userApiClient.login(login.missingPassword);
  expect(result.status).toBe(400);
  expect((result.body as { error: string }).error).toBe('Missing password');
});
