import { fetcher } from "../../../strapi/fetcher.js";
import { envClient } from "@repo/shared/env-client";
import { signReference, signReferenceResume, signConnectionDecision } from "./signature.js";
import { signAdminEdit } from "./signature.js";
import type { ServiceContext } from "../../../context.js";
import { ctxLog } from "../../../utils/logger/console.js";
import { buildPagination } from "../../../utils/pagination.js";
import type {
  GCContribution,
  GCContributionsArray,
  GCContributionsPaginated,
  GCContributionResponse,
} from "./schema/output.js";
import {
  gcContributionSchema,
  gcContributionsPaginatedSchema,
  gcContributionResponseSchema,
} from "./schema/output.js";
import { gcContributionDataSchema, type GCContributionData } from "./schema/input.js";
import { enrichPublicAttribution } from "../public-attribution.js";
import { signOwnerReference } from "./signature.js";
import { referenceAmendmentContextSchema, referenceAmendmentSchema, type ReferenceAmendment } from "./schema/amendment.js";
import { readOwnerHistory, ownerHistoryPagination } from "../owner-history.js";

async function ownerReference(ctx: ServiceContext, documentId: string, amendment?: ReferenceAmendment) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !ctx.user.id || !ctx.user.email) throw new Error("Owner access is not configured.");
  const body = JSON.stringify({
    operation: amendment ? "amend" : "read", actorId: ctx.user.id, actorEmail: ctx.user.email,
    documentId, ...(amendment ? referenceAmendmentSchema.parse(amendment) : {}),
  });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/gc-contributions/owner-reference`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { "Content-Type": "application/json", "x-reference-timestamp": timestamp,
      "x-reference-signature": signOwnerReference(body, timestamp, secret) }, body,
  });
  if (!response.ok) {
    const status = [400, 404, 409].includes(response.status) ? response.status : 502;
    throw Object.assign(new Error(status === 409
      ? "This reference changed since you opened it. Reload the saved version before saving again."
      : status === 404 ? "Saved reference not found."
      : status === 400 ? "Check the quotation, specificity and evidence. Catalogue identities cannot be changed."
      : "The correction could not be confirmed. Reload the saved version before retrying."), { status });
  }
  const result = await response.json();
  if (amendment) {
    if ((result as { saved?: unknown })?.saved !== true) throw new Error("The correction could not be confirmed.");
    return { saved: true as const };
  }
  return referenceAmendmentContextSchema.parse(result);
}

// Strapi generic response
interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

type StrapiGCContributionData = GCContribution;

// Resolve public attribution before the response schema drops private CMS fields.
async function transformStrapiGCContribution(ctx: ServiceContext, data: StrapiGCContributionData): Promise<GCContribution> {
  return gcContributionSchema.parse(await enrichPublicAttribution(ctx, data));
}

interface ContributionsInput {
  cursor?: number;
  limit?: number;
  filters?: Record<string, unknown>;
  sort?: string;
}

interface ContributionGetInput { id: string; }

interface ContributionGetBycontributorEmailInput {
  contributorEmail: string;
  cursor?: number;
  limit?: number;
}

// Get all contributions
async function getAll(ctx: ServiceContext, input: ContributionsInput = {}) {
  ctxLog(ctx, "GC-Contribution/GetAll", { input });

  const populate = {
    books: {
      populate: {
        author: true,
      },
    },
    gc_comments: true,
  };

  const response = await fetcher<StrapiResponse<StrapiGCContributionData[]>>("gc-contributions", {
    filters: input.filters,
    sort: input.sort || "publishedAt:desc",
    limit: input.limit || 100,
    page: input.cursor || 1,
    populate,
  });

  if (!response) {
    throw new Error("Failed to fetch GC contributions from Strapi");
  }

  const data = await Promise.all(response.data.map((item) => transformStrapiGCContribution(ctx, item)));

  const validated = gcContributionsPaginatedSchema.parse({
    data,
    meta: response.meta,
  });

  return buildPagination(validated.data, {
    total: response.meta.pagination?.total || 0,
    cursor: input.cursor || 1,
    limit: input.limit || 100,
  });
}

// Get single contribution
async function get(ctx: ServiceContext, input: ContributionGetInput) {
  ctxLog(ctx, "GC-Contribution/Get", { input });

  const populate = {
    books: {
      populate: {
        author: true,
      },
    },
    gc_comments: true,
  };

  const response = await fetcher<StrapiResponse<StrapiGCContributionData>>(`gc-contributions/${input.id}`, { populate });
  if (!response) throw new Error(`Failed to fetch contribution ${input.id}`);

  const data = await transformStrapiGCContribution(ctx, response.data);
  const validated = gcContributionResponseSchema.parse({ data, meta: response.meta });
  return validated.data;
}

async function getBycontributorEmail(ctx: ServiceContext, input: ContributionGetBycontributorEmailInput) {
  ctxLog(ctx, "GC-Contribution/GetBycontributorEmail", { input });

  const response = await fetcher<StrapiResponse<StrapiGCContributionData[]>>("gc-contributions", {
    filters: {
      contributorEmail: input.contributorEmail,
    },
    sort: "publishedAt:desc",
    limit: input.limit || 100,
    page: input.cursor || 1,
    populate: { books: { populate: { author: true } }, gc_comments: true },
  });
  if (!response) throw new Error(`Failed to fetch contribution by contributor email ${input.contributorEmail}`);
  const data = await Promise.all(response.data.map((item) => transformStrapiGCContribution(ctx, item)));
  try {
    const validated = gcContributionsPaginatedSchema.parse({ data, meta: response.meta });

    return buildPagination(validated.data, {
      total: response.meta.pagination?.total || 0,
      cursor: input.cursor || 1,
      limit: response.meta.pagination?.pageSize || 100,
    });
  } catch (error) {
    console.error("Validation error:", error);
    console.error("Transformed data that failed validation:", JSON.stringify(data, null, 2));
    console.error("Meta data:", JSON.stringify(response.meta, null, 2));
    throw error;
  }
}

async function getMine(ctx: ServiceContext, input: { cursor?: number; limit?: number }) {
  const validated = gcContributionsPaginatedSchema.extend({
    meta: gcContributionsPaginatedSchema.shape.meta.extend({ pagination: ownerHistoryPagination }),
  }).parse(await readOwnerHistory(ctx, "contributions", input));
  const data = await Promise.all(validated.data.map(item => transformStrapiGCContribution(ctx, item)));
  return buildPagination(data, {
    total: validated.meta.pagination.total,
    cursor: validated.meta.pagination.page,
    limit: validated.meta.pagination.pageSize,
  });
}

// Create contribution
async function create(ctx: ServiceContext, data: GCContributionData) {
  data = gcContributionDataSchema.parse(data);
  const transformedData = {
    ...data,
    // Public contributions originate in the scholarly network. Archive and AI
    // provenance are assigned through trusted CMS/import workflows, not client input.
    connectionSource: "scholar" as const,
    books: [data.bookA_id, data.bookB_id].filter((id): id is string => !!id),
  };

  transformedData.contributorEmail = ctx.user.email;

  const secret = process.env.SESSION_SECRET;
  if (!secret || !ctx.user.id) throw new Error("Scholarly submission is not configured.");
  const body = JSON.stringify({ actorId: ctx.user.id, data: transformedData });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const saved = await fetch(`${base}/api/gc-contributions/submit-reference`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { "Content-Type": "application/json", "x-reference-timestamp": timestamp,
      "x-reference-signature": signReference(body, timestamp, secret) },
    body,
  });
  if (!saved.ok) throw new Error("Failed to create GC contribution");
  const response = await saved.json() as StrapiResponse<StrapiGCContributionData>;
  const transformed = await transformStrapiGCContribution(ctx, response.data);
  const validated = gcContributionResponseSchema.parse({ data: transformed, meta: response.meta });
  return validated.data;
}

async function adminEdit(ctx: ServiceContext, input: {
  documentId: string;
  expectedUpdatedAt: string;
  data: Record<string, unknown>;
}) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !ctx.user.id || ctx.user.role !== "ADMIN") throw new Error("Administrator access is required.");
  const body = JSON.stringify({ actorId: ctx.user.id, ...input });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/gc-contributions/admin-edit`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
      "x-reference-timestamp": timestamp,
      "x-reference-signature": signAdminEdit(body, timestamp, secret),
    },
    body,
  });
  const result = await response.json().catch(() => null) as { saved?: boolean; updatedAt?: string } | null;
  if (response.status === 409) throw new Error("This proposal changed since you opened it. Reload it before editing.");
  if (response.status === 400) throw Object.assign(new Error("Check specificity, target quotation, stance and implicit evidence. Saved identities cannot be changed."), { status: 400 });
  if (!response.ok || result?.saved !== true || !result.updatedAt) {
    throw new Error("The save could not be confirmed. Reload the proposal before retrying.");
  }
  return result as { saved: true; updatedAt: string };
}

async function resume(ctx: ServiceContext, input: {
  documentId: string;
  expectedUpdatedAt: string;
  continuationKey: string;
  data: GCContributionData;
}) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !ctx.user.id) throw new Error("Connection continuation is not configured.");
  const data = gcContributionDataSchema.parse({
    ...input.data,
    contributorEmail: ctx.user.email,
  });
  const body = JSON.stringify({
    actorId: ctx.user.id,
    documentId: input.documentId,
    expectedUpdatedAt: input.expectedUpdatedAt,
    continuationKey: input.continuationKey,
    data,
  });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/gc-contributions/resume-reference`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
      "x-reference-timestamp": timestamp,
      "x-reference-signature": signReferenceResume(body, timestamp, secret),
    },
    body,
  });
  const result = await response.json().catch(() => null) as {
    saved?: boolean; updatedAt?: string; error?: string;
  } | null;
  if (response.status === 409) throw new Error("This connection changed since you opened it. Reload before continuing.");
  if (!response.ok || !result?.saved || !result.updatedAt) {
    throw new Error(result?.error || "The connection could not be continued.");
  }
  return { saved: true as const, updatedAt: result.updatedAt };
}

async function adminDecision(ctx: ServiceContext, input: {
  documentId: string;
  expectedUpdatedAt: string;
  decision: "accepted" | "rejected";
  note?: string;
}) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !ctx.user.id || ctx.user.role !== "ADMIN") {
    throw new Error("Administrator access is required.");
  }
  const body = JSON.stringify({ actorId: ctx.user.id, ...input });
  const timestamp = String(Date.now());
  const base = envClient.VITE_STRAPI_FETCH_URL.replace(/\/$/, "");
  const response = await fetch(`${base}/api/gc-contributions/admin-decision`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      "Content-Type": "application/json",
      "x-reference-timestamp": timestamp,
      "x-reference-signature": signConnectionDecision(body, timestamp, secret),
    },
    body,
  });
  const result = await response.json().catch(() => null) as { saved?: boolean; updatedAt?: string; error?: string } | null;
  if (response.status === 409) throw new Error("This connection changed since you opened it. Reload before reviewing.");
  if (!response.ok || !result?.saved) throw new Error(result?.error || "The connection decision could not be saved.");
  return result;
}

export const gcContributionService = {
  getAll,
  get,
  getBycontributorEmail,
  getMine,
  create,
  adminEdit,
  ownerReference,
  resume,
  adminDecision,
};

export type {
  GCContribution,
  GCContributionsArray,
  GCContributionsPaginated,
  GCContributionResponse,
} from "./schema/output.js";
export type { GCContributionData } from "./schema/input.js";

export { gcContributionSchema, gcContributionsPaginatedSchema, gcContributionResponseSchema } from "./schema/output.js";
export { gcContributionDataSchema, gcContributionInputSchema } from "./schema/input.js";
export { referenceDetailsSchema } from "./schema/reference.js";
export type { ReferenceDetails } from "./schema/reference.js";
export { referenceAmendmentSchema } from "./schema/amendment.js";
export type { ReferenceAnalysis, ReferenceAmendmentContext, ReferenceAmendment } from "./schema/amendment.js";
