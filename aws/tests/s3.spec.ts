// AWS S3: file existence and prefix listing checks. Requires a real AWS account/key.
import { test, expect } from '../../fixtures/base.fixture';

// A known sample file is reported as present in the S3 bucket.
test('Verify an uploaded file exists in the S3 bucket', async ({ s3Service }) => {
  const exists = await s3Service.fileExists('sample-folder/sample-file.txt');
  expect(exists).toBeTruthy();
});

// Listing by prefix returns at least one file under that folder.
test('List files under a given prefix', async ({ s3Service }) => {
  const files = await s3Service.listFiles('sample-folder/');
  expect(files.length).toBeGreaterThan(0);
});
