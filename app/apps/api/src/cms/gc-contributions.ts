import {
  gcContributionService,
  createServiceContext,
  type GCContributionData,
  type AuthUser,
  type ServiceContext,
} from "@repo/server";

export class GCContributionsCMS {
  private locale: string;

  constructor(locale: string = "en") {
    this.locale = locale;
  }

  private getContext() {
    return createServiceContext(this.locale, {
      id: "public",
      email: "public@example.com",
      name: "Public User",
      role: "USER",
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
    return await gcContributionService.getAll(ctx, input);
  }

  async get(id: string) {
    const ctx = this.getContext();
    return await gcContributionService.get(ctx, { id });
  }

  async getBycontributorEmail(contributorEmail: string, input?: {
    cursor?: number;
    limit?: number;
  }) {
    const ctx = this.getContext();
    return await gcContributionService.getBycontributorEmail(ctx, { contributorEmail, ...input });
  }

  async create(data: GCContributionData, user: AuthUser) {
    const ctx = this.getContextWithUser(user);
    return await gcContributionService.create(ctx, data);
  }
}
