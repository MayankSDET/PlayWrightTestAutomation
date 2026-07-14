import { test, expect } from '../fixtures/base.fixture';

test('Verify an uploaded file exists in the S3 bucket', async ({ s3Service }) => {
  const exists = await s3Service.fileExists('sample-folder/sample-file.txt');
  expect(exists).toBeTruthy();
});

test('List files under a given prefix', async ({ s3Service }) => {
  const files = await s3Service.listFiles('sample-folder/');
  expect(files.length).toBeGreaterThan(0);
});
