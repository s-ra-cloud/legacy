import { invariantNotFound } from "@repo/shared";
import { buildPagination } from "../../client.js";
import type { ServiceContext } from "../../context.js";
import { mediaActions } from "./actions/index.js";
import { mediaGetAllQuery } from "./queries/get-all.js";
import { mediaQueries } from "./queries/index.js";
import type { MediaGetAllInput } from "./schemas/input.js";

export * from "./schemas/input.js";
export * from "./schemas/output.js";

async function getAll(ctx: ServiceContext, query: MediaGetAllInput) {
  const items = await mediaGetAllQuery(ctx, query);
  return buildPagination(items, {
    cursor: 1,
    limit: 10,
    total: 10,
  });
}

async function get(ctx: ServiceContext, id: string) {
  const media = await mediaQueries.get(ctx, id);
  invariantNotFound(media);
  return media;
}

async function create(ctx: ServiceContext, file: File) {
  const objectKey = await ctx.minio.uploadToMinio(file);

  invariantNotFound(objectKey);

  const info = await mediaActions.create(ctx, {
    name: file.name,
    type: file.type,
    size: file.size,
    objectKey,
  });

  return info;
}

export const mediaService = {
  create,
  get,
  update: mediaActions.update,
  getAll,
};
