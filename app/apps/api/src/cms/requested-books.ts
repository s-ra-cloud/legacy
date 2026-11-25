import {
  requestedBookService,
  createServiceContext,
  type RequestedBookData,
  type AuthUser,
  type ServiceContext,
} from '@repo/server';

export class RequestedBooksCMS {
  private locale: string;

  constructor(locale: string = 'en') {
    this.locale = locale;
  }

  private getContext() {
    return createServiceContext(this.locale, {
      id: 'public',
      email: 'public@example.com',
      name: 'Public User',
      role: 'USER',
    } as any);
  }

  private getContextWithUser(user: AuthUser): ServiceContext {
    return createServiceContext(this.locale, user);
  }

  async getAll(input?: {
    cursor?: number;
    limit?: number;
    filters?: Record<string, unknown>;
    sort?: string;
  }) {
    const ctx = this.getContext();
    return await requestedBookService.getAll(ctx, input);
  }

  async get(id: string) {
    const ctx = this.getContext();
    return await requestedBookService.get(ctx, { id });
  }

  async create(data: RequestedBookData, user: AuthUser) {
    const ctx = this.getContextWithUser(user);
    return await requestedBookService.create(ctx, data);
  }
}
