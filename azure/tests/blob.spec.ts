// Azure Blob Storage: file existence and prefix listing checks. Requires a real storage account/key.
import { test, expect } from '../../fixtures/base.fixture';

// A known sample file is reported as present in the Blob container.
test('Verify an uploaded file exists in the Blob container', async ({ blobService }) => {
  const exists = await blobService.fileExists('sample-folder/sample-file.txt');
  expect(exists).toBeTruthy();
});

// Listing by prefix returns at least one file under that folder.
test('List files under a given prefix', async ({ blobService }) => {
  const files = await blobService.listFiles('sample-folder/');
  expect(files.length).toBeGreaterThan(0);
});
