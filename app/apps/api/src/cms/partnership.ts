import {
  partnershipsService,
  createServiceContext
} from "@repo/server";

export class PartnershipCMS {
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
    return await partnershipsService.getAll(ctx, input);
  }

  async get(id: number) {
    const ctx = this.getContext();
    return await partnershipsService.get(ctx, { id });
  }

  async getByIndexRange(startIndex: number, endIndex: number, input?: {
    cursor?: number;
    limit?: number;
    search?: string;
    sort?: string;
    filters?: Record<string, unknown>;
  }) {
    const ctx = this.getContext();
    return await partnershipsService.getByIndexRange(ctx, startIndex, endIndex, input);
  }
}
