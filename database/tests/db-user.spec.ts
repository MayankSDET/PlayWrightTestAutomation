// Database: CRUD lifecycle for a user record via the userRepository fixture.
import { test, expect } from '../../fixtures/base.fixture';

// Create a user, read it back, update its email, then delete and confirm it's gone.
test('create -> get -> update -> delete: chained user record', async ({ userRepository }) => {
  const created = userRepository.create('jdoe', 'jdoe@example.com');
  expect(created.id).toBeTruthy();

  const fetched = userRepository.getById(created.id);
  expect(fetched?.username).toBe('jdoe');

  const updated = userRepository.update(created.id, { email: 'jdoe.updated@example.com' });
  expect(updated?.email).toBe('jdoe.updated@example.com');

  userRepository.delete(created.id);

  expect(userRepository.exists(created.id)).toBeFalsy();
});
