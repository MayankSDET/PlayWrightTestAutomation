import { test, expect } from '../../fixtures/base.fixture';

test('Verify an uploaded file exists in the Blob container', async ({ blobService }) => {
  const exists = await blobService.fileExists('sample-folder/sample-file.txt');
  expect(exists).toBeTruthy();
});

test('List files under a given prefix', async ({ blobService }) => {
  const files = await blobService.listFiles('sample-folder/');
  expect(files.length).toBeGreaterThan(0);
});
