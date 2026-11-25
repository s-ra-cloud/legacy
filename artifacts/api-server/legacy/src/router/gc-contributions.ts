import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { describeRoute } from "hono-openapi";
import {
  gcContributionSchema,
  gcContributionsPaginatedSchema,
  gcContributionInputSchema,
  referenceAmendmentSchema,
  gcContributionDataSchema,
} from "@repo/server";
import { okResponse, notFoundResponse } from "~/utils/describe/index.js";
import { GCContributionsCMS } from "~/cms/gc-contributions.js";
import { protectedRoute } from "~/middlewares/hono.js";

import { RequestedBooksCMS } from "~/cms/requested-books.js";

const TAG = "GC Contributions";
export const gcContributionsRouter = new Hono();
gcContributionsRouter.use("/admin/*", bodyLimit({ maxSize: 256 * 1024 }));
gcContributionsRouter.use("/:documentId/amendment", bodyLimit({ maxSize: 256 * 1024 }));

const amendmentParam = z.object({ documentId: z.string().min(1).max(255) });
function amendmentError(c: Context, error: unknown) {
  const status = (error as { status?: number })?.status;
  if (status === 400 || status === 404 || status === 409) {
    return c.json({ error: (error as Error).message }, status);
  }
  return c.json({ error: "The correction could not be confirmed. Reload the saved version before retrying." }, 502);
}

gcContributionsRouter.get("/:documentId/amendment", protectedRoute(), zValidator("param", amendmentParam),
  describeRoute({ summary: "Load the owner's saved reference analysis and revision history", tags: [TAG],
    responses: { 200: { description: "Owner correction context" }, 404: notFoundResponse() } }),
  async c => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    try {
      return c.json(await new GCContributionsCMS().ownerReference(c.req.valid("param").documentId, c.get("user")));
    } catch (error) { return amendmentError(c, error); }
  });
gcContributionsRouter.post("/:documentId/amendment", protectedRoute(), zValidator("param", amendmentParam),
  zValidator("json", referenceAmendmentSchema),
  describeRoute({ summary: "Amend the owner's saved reference without replacing its identity", tags: [TAG],
    responses: { 200: { description: "Correction saved" }, 409: { description: "Saved version changed" } } }),
  async c => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    try {
      return c.json(await new GCContributionsCMS().ownerReference(c.req.valid("param").documentId, c.get("user"), c.req.valid("json")));
    } catch (error) { return amendmentError(c, error); }
  });

// Query schema
const querySchema = z.object({
  cursor: z.coerce.number().int().gt(0).max(10000).default(1),
  limit: z.coerce.number().int().gt(0).max(100).default(100),
  sort: z.string().optional(),
});
const adminProposalQuery = z.object({
  cursor: z.coerce.number().int().gt(0).default(1),
  limit: z.coerce.number().int().gt(0).max(100).default(50),
  search: z.string().trim().max(100).optional(),
});
const editableText = z.string().max(65535).nullable().optional();
const adminEditSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  data: z.object({
    bookA_textExcerpt: z.string().min(1).max(65535),
    bookB_textExcerpt: editableText,
    connectionType: z.enum(["explicit", "implicit"]).nullable().optional(),
    connectionNature: z.enum(["agreement", "neutral / unsure", "opposition", "neutral", "mixed"]).nullable().optional(),
    connectionUncertain: z.boolean().nullable().optional(),
    originComment: editableText,
    supportingReference: editableText,
    isSimilarityIdeas: z.boolean().nullable().optional(),
    isBiographical: z.boolean().nullable().optional(),
    isOther: z.boolean().nullable().optional(),
    explainConnection: editableText,
    referenceDetails: z.object({
      explicitLevel: z.enum(["none", "author", "work", "passage"]),
      implicitLevel: z.enum(["author", "work", "passage"]).nullable(),
      effectiveLevel: z.enum(["author", "work", "passage"]),
    }).strict().nullable().optional(),
  }).strict().refine(data => Object.keys(data).length > 0),
}).strict();
const connectionDecisionSchema = z.object({
  expectedUpdatedAt: z.string().datetime(),
  decision: z.enum(["accepted", "rejected"]),
  note: z.string().trim().max(2000).optional(),
}).strict();

gcContributionsRouter.get(
  "/",
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get all GC contributions",
    tags: [TAG],
    responses: {
      200: okResponse(gcContributionsPaginatedSchema, "Contributions retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const query = c.req.valid("query");
    const cms = new GCContributionsCMS();
    const result = await cms.getAll({
      cursor: query.cursor,
      limit: query.limit,
      sort: query.sort,
    });
    if (!result) return c.json({ error: "No contributions found" }, 404);
    return c.json({
      data: result.items,
      meta: {
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.limit,
          pageCount: Math.ceil(result.pagination.total / result.pagination.limit),
          total: result.pagination.total,
        },
      },
    });
  },
);

gcContributionsRouter.get(
  "/admin/proposals",
  protectedRoute(["ADMIN"]),
  zValidator("query", adminProposalQuery),
  describeRoute({
    summary: "List scholar-submitted connections for administrators",
    tags: [TAG],
    responses: { 200: okResponse(gcContributionsPaginatedSchema, "Proposals retrieved") },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    const query = c.req.valid("query");
    const search = query.search?.replace(/[\\%_]/g, "\\$&");
    const filters = {
      connectionSource: { $eq: "scholar" },
      $and: [
        { $or: [
          { connectionReviewStatus: { $eq: "editorial_review" } },
          { connectionReviewStatus: { $eq: "accepted" } },
          { connectionReviewStatus: { $eq: "rejected" } },
          { connectionReviewStatus: { $null: true } },
        ] },
        ...(search ? [{ $or: [
          { bookA_title: { $containsi: search } },
          { bookB_title: { $containsi: search } },
          { bookA_textExcerpt: { $containsi: search } },
          { bookB_textExcerpt: { $containsi: search } },
        ] }] : []),
      ],
    };
    const result = await new GCContributionsCMS().getAll({
      cursor: query.cursor, limit: query.limit, sort: "createdAt:desc", filters,
    });
    return c.json({
      data: result?.items ?? [],
      meta: { pagination: {
        page: result?.pagination.page ?? query.cursor,
        pageSize: result?.pagination.limit ?? query.limit,
        pageCount: Math.ceil((result?.pagination.total ?? 0) / query.limit),
        total: result?.pagination.total ?? 0,
      } },
    });
  },
);

gcContributionsRouter.post(
  "/admin/:documentId/decision",
  protectedRoute(["ADMIN"]),
  zValidator("param", z.object({ documentId: z.string().min(1).max(255) })),
  zValidator("json", connectionDecisionSchema),
  describeRoute({
    summary: "Accept or reject a scholar connection after editorial review",
    tags: [TAG],
    responses: { 200: { description: "Connection decision saved" }, 409: { description: "Connection changed or is not awaiting review" } },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    try {
      const { documentId } = c.req.valid("param");
      const body = c.req.valid("json");
      return c.json(await new GCContributionsCMS().adminDecision(
        documentId, body.expectedUpdatedAt, body.decision, body.note, c.get("user"),
      ));
    } catch (error) {
      if (error instanceof Error && error.message.includes("changed since you opened")) {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: error instanceof Error ? error.message : "The connection decision could not be saved." }, 400);
    }
  },
);

gcContributionsRouter.post(
  "/admin/:documentId/edit",
  protectedRoute(["ADMIN"]),
  zValidator("param", z.object({ documentId: z.string().min(1).max(255) })),
  zValidator("json", adminEditSchema),
  describeRoute({
    summary: "Edit evidence and connection details on a scholar submission",
    tags: [TAG],
    responses: { 200: { description: "Proposal updated" }, 409: { description: "Proposal changed since it was opened" } },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    try {
      const { documentId } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await new GCContributionsCMS().adminEdit(
        documentId, body.expectedUpdatedAt, body.data, c.get("user"),
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("changed since you opened")) {
        return c.json({ error: error.message }, 409);
      }
      if (error instanceof Error && (error as Error & { status?: number }).status === 400) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: "The save could not be confirmed. Reload the proposal before retrying." }, 502);
    }
  },
);

// Register static paths before /:id so "mine" cannot become a contribution ID.
gcContributionsRouter.get(
  "/mine",
  protectedRoute(),
  zValidator("query", querySchema),
  describeRoute({
    summary: "Get the signed-in user's Great Conversation contributions",
    tags: [TAG],
    responses: { 200: okResponse(z.object({ data: z.array(gcContributionSchema), meta: z.any() }), "Your contributions retrieved") },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    const query = c.req.valid("query");
    const user = c.get("user");
    let result: Awaited<ReturnType<GCContributionsCMS["getMine"]>>;
    try { result = await new GCContributionsCMS().getMine(user, {
      cursor: query.cursor,
      limit: query.limit,
    }); } catch {
      return c.json({ error: "Your Great Conversation contributions could not be loaded. Please retry.", code: "CONTRIBUTION_HISTORY_UNAVAILABLE" }, 502);
    }
    const requests: { items: Awaited<ReturnType<RequestedBooksCMS["getMine"]>>["items"] } = { items: [] };
    try {
      // Requests can be linked to any page of history; never silently truncate.
      for (let cursor = 1; cursor <= 100; cursor++) {
        const page = await new RequestedBooksCMS().getMine(user, { cursor, limit: 100 });
        requests.items.push(...page.items);
        if (cursor * 100 >= page.pagination.total) break;
        if (cursor === 100) throw new Error("Request history exceeds read limit.");
      }
    } catch {
      return c.json({ error: "Your catalogue requests could not be loaded. Your contribution history is unavailable until this succeeds. Please retry.",
        code: "CATALOGUE_REQUEST_HISTORY_UNAVAILABLE" }, 502);
    }
    const contributions = result.items.map(contribution => ({
      ...contribution,
      suggestions: requests.items.filter(request => request.contributionDocumentId === contribution.documentId),
      continuationState: contribution.connectionReviewStatus === "catalogue_review"
        ? "awaiting_catalogue_review"
        : contribution.connectionReviewStatus === "ready_to_continue"
          ? "ready_to_continue"
          : contribution.connectionReviewStatus === "editorial_review"
            ? "back_in_editorial_review"
            : contribution.connectionReviewStatus === "rejected" ? "rejected"
              : contribution.connectionReviewStatus === "accepted" ? "accepted"
                : "previously_published",
    }));
    c.header("Cache-Control", "private, no-store");
    c.header("Vary", "Cookie");
    return c.json({
      data: contributions,
      requests: requests.items.filter(request => !request.contributionDocumentId),
      meta: {
        pagination: {
          page: result.pagination.page,
          pageSize: result.pagination.limit,
          pageCount: Math.ceil(result.pagination.total / result.pagination.limit),
          total: result.pagination.total,
        },
      },
    });
  },
);

gcContributionsRouter.get(
  "/:id",
  zValidator("param", z.object({ id: z.string() })),
  describeRoute({
    summary: "Get GC contribution by ID",
    tags: [TAG],
    responses: {
      200: okResponse(gcContributionSchema, "Contribution retrieved"),
      404: notFoundResponse(),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const cms = new GCContributionsCMS();
    const contribution = await cms.get(id);
    if (!contribution) return c.json({ error: "Contribution not found" }, 404);
    return c.json(contribution);
  },
);

gcContributionsRouter.post(
  "/:documentId/resume",
  protectedRoute(),
  zValidator("param", z.object({ documentId: z.string().min(1).max(255) })),
  zValidator("json", z.object({
    expectedUpdatedAt: z.string().datetime(),
    continuationKey: z.string().uuid(),
    data: gcContributionDataSchema,
  }).strict()),
  describeRoute({
    summary: "Continue an owned saved connection after catalogue review",
    tags: [TAG],
    responses: { 200: { description: "Saved connection returned to editorial review" }, 409: { description: "Connection changed since it was opened" } },
  }),
  async (c) => {
    c.header("Cache-Control", "private, no-store");
    try {
      const { documentId } = c.req.valid("param");
      const body = c.req.valid("json");
      const result = await new GCContributionsCMS().resume(
        documentId, body.expectedUpdatedAt, body.continuationKey, body.data, c.get("user"),
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes("changed since you opened")) {
        return c.json({ error: error.message }, 409);
      }
      return c.json({ error: error instanceof Error ? error.message : "The connection could not be continued." }, 400);
    }
  },
);

gcContributionsRouter.post(
  "/",
  protectedRoute(),
  zValidator("json", gcContributionInputSchema),
  describeRoute({
    summary: "Create GC contribution",
    tags: [TAG],
    responses: {
      201: okResponse(gcContributionSchema, "Contribution created"),
      400: notFoundResponse(),
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const cms = new GCContributionsCMS();
    try {
      const contribution = await cms.create(body.data, c.get("user"));
      if (!contribution) return c.json({ error: "Failed to create contribution" }, 400);
      return c.json(contribution, 201);
    } catch {
      return c.json({ error: "Unable to save this reference. Check the selected catalogue entries and try again. Your draft has not been cleared." }, 502);
    }
  },
);
