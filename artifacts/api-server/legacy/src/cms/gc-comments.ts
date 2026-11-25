import {
  gcCommentService,
  createServiceContext,
  type GCCommentData,
  type AuthUser,
  type ServiceContext,
} from "@repo/server";

export class GCCommentsCMS {
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
    return await gcCommentService.getAll(ctx, input);
  }

  async get(id: string) {
    const ctx = this.getContext();
    return await gcCommentService.get(ctx, { id });
  }

  async getByContributorEmail(contributorEmail: string, input?: {
    cursor?: number;
    limit?: number;
  }) {
    const ctx = this.getContext();
    return await gcCommentService.getByContributorEmail(ctx, { contributorEmail, ...input });
  }

  async getByContribution(contributionId: string, input?: {
    cursor?: number;
    limit?: number;
  }) {
    const ctx = this.getContext();
    return await gcCommentService.getByContribution(ctx, { contributionId, ...input });
  }

  async create(data: GCCommentData, user: AuthUser) {
    const ctx = this.getContextWithUser(user);
    return await gcCommentService.create(ctx, data);
  }
}
