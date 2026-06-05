import {
  heroPhilosophersService,
  createServiceContext,
} from "@repo/server";

export class HeroPhilosophersCMS {
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

  async getAll(input?: {
    cursor?: number;
    limit?: number;
    sort?: string;
    filters?: Record<string, unknown>;
  }) {
    const ctx = this.getContext();
    return await heroPhilosophersService.getAll(ctx, input);
  }
}
