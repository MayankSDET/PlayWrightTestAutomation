import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getAwsConfig } from '../config/awsConfig';

export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(bucket?: string) {
    const config = getAwsConfig();
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = bucket ?? config.bucketName;
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error: unknown) {
      if (
        error instanceof S3ServiceException &&
        (error.$metadata.httpStatusCode === 404 || error.name === 'NotFound')
      ) {
        return false;
      }
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    const result = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix })
    );
    return (result.Contents ?? [])
      .map((object) => object.Key)
      .filter((key): key is string => Boolean(key));
  }

  async getFileContent(key: string): Promise<string> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    const body = await result.Body?.transformToString();
    if (body === undefined) {
      throw new Error(`No content found for key: ${key}`);
    }
    return body;
  }
}
