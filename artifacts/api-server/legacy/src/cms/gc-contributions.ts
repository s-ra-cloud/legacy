import {
  gcContributionService,
  createServiceContext,
  type GCContributionData,
  type AuthUser,
  type ServiceContext,
  type ReferenceAmendment,
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

  async getMine(user: AuthUser, input?: { cursor?: number; limit?: number }) {
    return await gcContributionService.getMine(this.getContextWithUser(user), input ?? {});
  }

  async create(data: GCContributionData, user: AuthUser) {
    const ctx = this.getContextWithUser(user);
    return await gcContributionService.create(ctx, data);
  }

  async adminEdit(documentId: string, expectedUpdatedAt: string, data: Record<string, unknown>, user: AuthUser) {
    return await gcContributionService.adminEdit(this.getContextWithUser(user), {
      documentId, expectedUpdatedAt, data,
    });
  }

  async ownerReference(documentId: string, user: AuthUser, amendment?: ReferenceAmendment) {
    return gcContributionService.ownerReference(this.getContextWithUser(user), documentId, amendment);
  }

  async resume(documentId: string, expectedUpdatedAt: string, continuationKey: string, data: GCContributionData, user: AuthUser) {
    return await gcContributionService.resume(this.getContextWithUser(user), {
      documentId, expectedUpdatedAt, continuationKey, data,
    });
  }

  async adminDecision(documentId: string, expectedUpdatedAt: string, decision: "accepted" | "rejected", note: string | undefined, user: AuthUser) {
    return await gcContributionService.adminDecision(this.getContextWithUser(user), {
      documentId, expectedUpdatedAt, decision, note,
    });
  }
}
