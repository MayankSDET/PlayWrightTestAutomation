import { expect } from '@playwright/test';
import { BaseApiClient } from './BaseApiClient';

export type ReqresUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
};

export type UserListPage = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: ReqresUser[];
};

export type CreateUserPayload = {
  name: string;
  job: string;
};

export type CreatedUser = CreateUserPayload & {
  id: string;
  createdAt: string;
};

export type UpdatedUser = CreateUserPayload & {
  updatedAt: string;
};

export type RegisterPayload = {
  email: string;
  password?: string;
};

export type RegisterSuccess = {
  id: number;
  token: string;
};

export type LoginPayload = {
  email: string;
  password?: string;
};

export type LoginSuccess = {
  token: string;
};

export type AuthFailure = {
  error: string;
};

export type ApiResult<T> = {
  status: number;
  body: T;
};

export class UserApiClient extends BaseApiClient {
  private readonly basePath = '/api/users';

  async list(page: number): Promise<UserListPage> {
    const response = await this.request.get(`${this.basePath}?page=${page}`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async getById(id: number): Promise<{ data: ReqresUser }> {
    const response = await this.request.get(`${this.basePath}/${id}`);
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async exists(id: number): Promise<boolean> {
    const response = await this.request.get(`${this.basePath}/${id}`);
    return response.ok();
  }

  async create(payload: CreateUserPayload): Promise<CreatedUser> {
    const response = await this.request.post(this.basePath, { data: payload });
    expect(response.status()).toBe(201);
    return response.json();
  }

  async update(id: number, payload: CreateUserPayload): Promise<UpdatedUser> {
    const response = await this.request.put(`${this.basePath}/${id}`, { data: payload });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async partialUpdate(id: number, payload: Partial<CreateUserPayload>): Promise<UpdatedUser> {
    const response = await this.request.patch(`${this.basePath}/${id}`, { data: payload });
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await this.request.delete(`${this.basePath}/${id}`);
    expect(response.status()).toBe(204);
  }

  async register(payload: RegisterPayload): Promise<ApiResult<RegisterSuccess | AuthFailure>> {
    const response = await this.request.post('/api/register', { data: payload });
    return { status: response.status(), body: await response.json() };
  }

  async login(payload: LoginPayload): Promise<ApiResult<LoginSuccess | AuthFailure>> {
    const response = await this.request.post('/api/login', { data: payload });
    return { status: response.status(), body: await response.json() };
  }
}
