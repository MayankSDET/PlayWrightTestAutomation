import {
  LambdaClient,
  GetFunctionCommand,
  InvokeCommand,
  ListFunctionsCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-lambda';
import { getLambdaConfig } from '../config/lambdaConfig';

export type InvokeResult = {
  statusCode: number;
  payload: unknown;
};

export class LambdaService {
  private readonly client: LambdaClient;
  private readonly functionName: string;

  constructor(functionName?: string) {
    const config = getLambdaConfig();
    this.client = new LambdaClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.functionName = functionName ?? config.functionName;
  }

  async functionExists(): Promise<boolean> {
    try {
      await this.client.send(new GetFunctionCommand({ FunctionName: this.functionName }));
      return true;
    } catch (error: unknown) {
      if (error instanceof ResourceNotFoundException) {
        return false;
      }
      throw error;
    }
  }

  async invoke(payload: unknown): Promise<InvokeResult> {
    const result = await this.client.send(
      new InvokeCommand({
        FunctionName: this.functionName,
        Payload: Buffer.from(JSON.stringify(payload)),
      })
    );
    const raw = result.Payload ? Buffer.from(result.Payload).toString('utf-8') : '';
    return {
      statusCode: result.StatusCode ?? 0,
      payload: raw ? JSON.parse(raw) : null,
    };
  }

  async listFunctions(): Promise<string[]> {
    const result = await this.client.send(new ListFunctionsCommand({}));
    return (result.Functions ?? [])
      .map((fn) => fn.FunctionName)
      .filter((name): name is string => Boolean(name));
  }
}
