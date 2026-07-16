import { APIRequestContext, APIResponse } from '@playwright/test';

export abstract class BaseApiClient {
  constructor(protected readonly request: APIRequestContext) {}

  // Throws with the actual status + response body on failure, instead of a bare
  // "expected true, received false" — the difference between a real bug and, say,
  // a rate-limited public API being immediately obvious from the test output.
  protected async ensureOk(response: APIResponse, action: string): Promise<void> {
    if (!response.ok()) {
      const body = await response.text().catch(() => '<no response body>');
      throw new Error(`${action} failed: ${response.status()} ${response.statusText()} — ${body}`);
    }
  }

  protected async ensureStatus(response: APIResponse, expectedStatus: number, action: string): Promise<void> {
    if (response.status() !== expectedStatus) {
      const body = await response.text().catch(() => '<no response body>');
      throw new Error(
        `${action} failed: expected status ${expectedStatus}, got ${response.status()} ${response.statusText()} — ${body}`
      );
    }
  }
}
