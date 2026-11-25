import {
  authorsService,
  createServiceContext
} from "@repo/server";

export class AuthorsCMS {
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

  async getAll(input?: {
    cursor?: number;
    limit?: number;
    search?: string;
    sort?: string;
    filters?: Record<string, unknown>;
  }) {
    const ctx = this.getContext();
    return await authorsService.getAll(ctx, input);
  }

  async get(id: string) {
    const ctx = this.getContext();
    return await authorsService.get(ctx, { id });
  }
}
