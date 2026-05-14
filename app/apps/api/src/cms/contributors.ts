import {
  contributorsService,
  createServiceContext
} from "@repo/server";

export class ContributorsCMS {
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
    return await contributorsService.getAll(ctx, input);
  }

  async get(id: number) {
    const ctx = this.getContext();
    return await contributorsService.get(ctx, { id });
  }
}
