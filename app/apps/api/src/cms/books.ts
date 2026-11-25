import {
  booksService,
  createServiceContext,
  type AuthUser,
  type BookData,
  type ServiceContext
} from "@repo/server";

export class BooksCMS {
  private locale: string;

  constructor(locale: string = "en") {
    this.locale = locale;
  }

  private getContext() {
    // Create a public context without user authentication
    return createServiceContext(this.locale, {
      id: "public",
      email: "public@example.com",
      name: "Public User",
      role: "USER"
    } as any);
  }

  private getContextWithUser(user: AuthUser): ServiceContext {
    return createServiceContext(this.locale, user);
  }

  async getAll(input?: {
    cursor?: number;
    limit?: number;
    search?: string;
    sort?: string;
    filters?: Record<string, unknown>;
  }) {
    const ctx = this.getContext();
    return await booksService.getAll(ctx, input);
  }

  async get(id: string) {
    const ctx = this.getContext();
    return await booksService.get(ctx, { id });
  }

  async getBycontributerEmail(contributerEmail: string, input?: {
    cursor?: number;
    limit?: number;
  }) {
    const ctx = this.getContext();
    return await booksService.getBycontributerEmail(ctx, {
      contributerEmail,
      ...input,
    });
  }

  async create(bookData: BookData, user: AuthUser) {
    const ctx = this.getContextWithUser(user);
    return await booksService.create(ctx, bookData);
  }
}
