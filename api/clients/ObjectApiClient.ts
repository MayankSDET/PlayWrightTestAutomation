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
    await this.ensureOk(response, 'Create object');
    return response.json();
  }

  async get(id: string): Promise<TestObject> {
    const response = await this.request.get(`${this.basePath}/${id}`);
    await this.ensureOk(response, `Get object ${id}`);
    return response.json();
  }

  async update(id: string, payload: TestObjectPayload): Promise<TestObject> {
    const response = await this.request.put(`${this.basePath}/${id}`, { data: payload });
    await this.ensureOk(response, `Update object ${id}`);
    return response.json();
  }

  async delete(id: string): Promise<void> {
    const response = await this.request.delete(`${this.basePath}/${id}`);
    await this.ensureOk(response, `Delete object ${id}`);
  }

  async exists(id: string): Promise<boolean> {
    const response = await this.request.get(`${this.basePath}/${id}`);
    if (response.status() === 404) return false;
    await this.ensureOk(response, `Check object ${id} exists`);
    return true;
  }
}
