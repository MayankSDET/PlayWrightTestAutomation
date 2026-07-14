import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { getAzureConfig } from '../config/azureConfig';

export class BlobService {
  private readonly containerClient: ContainerClient;

  constructor(containerName?: string) {
    const config = getAzureConfig();
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
    this.containerClient = blobServiceClient.getContainerClient(containerName ?? config.containerName);
  }

  async fileExists(blobName: string): Promise<boolean> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.exists();
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const names: string[] = [];
    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      names.push(blob.name);
    }
    return names;
  }

  async getFileContent(blobName: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    const downloadResponse = await blockBlobClient.download();
    return streamToString(downloadResponse.readableStreamBody);
  }
}

async function streamToString(readableStream?: NodeJS.ReadableStream): Promise<string> {
  if (!readableStream) {
    throw new Error('No readable stream returned from blob download');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of readableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}
