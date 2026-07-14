import { expect } from '@playwright/test';
import { BaseApiClient } from './BaseApiClient';

export type TestObject = {
  id: string;
  name: string;
  data?: Record<string, unknown>;
};

export type TestObjectPayload = {
  name: string;
  data?: Record<string, unknown>;
};

export class ObjectApiClient extends BaseApiClient {
  private readonly basePath = '/objects';

  async create(payload: TestObjectPayload): Promise<TestObject> {
    const response = await this.request.post(this.basePath, { data: payload });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async get(id: string): Promise<TestObject> {
    const response = await this.request.get(`${this.basePath}/${id}`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async update(id: string, payload: TestObjectPayload): Promise<TestObject> {
    const response = await this.request.put(`${this.basePath}/${id}`, { data: payload });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async delete(id: string): Promise<void> {
    const response = await this.request.delete(`${this.basePath}/${id}`);
    expect(response.ok()).toBeTruthy();
  }

  async exists(id: string): Promise<boolean> {
    const response = await this.request.get(`${this.basePath}/${id}`);
    return response.ok();
  }
}
