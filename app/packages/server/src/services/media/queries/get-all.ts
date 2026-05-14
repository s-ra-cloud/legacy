import {
  handleFilterNumber,
  handleFilterString,
  jsonObjectFrom,
} from "@repo/db";
import { invariantBadRequest, parseFilters } from "@repo/shared";
import type { ServiceContext } from "../../../context.js";
import type { MediaGetAllInput } from "../schemas/input.js";

function getBaseQuery(ctx: ServiceContext, input: MediaGetAllInput) {
  const filter = parseFilters(input);
  invariantBadRequest(filter.id?.in, "id is required"); //TODO(konami) have better way to handle this

  const isAdmin = ctx.user.role.includes("ADMIN");

  return ctx.db
    .selectFrom("media as m")
    .where("m.id", "in", filter.id.in)
    .$if(!isAdmin, (qb) => qb.where("m.userId", "=", ctx.user.id));
}

export async function mediaGetAllQuery(
  ctx: ServiceContext,
  input: MediaGetAllInput,
) {
  const cursor = input.cursor - 1;
  const media = await getBaseQuery(ctx, input)
    .selectAll("m")
    .limit(input.limit)
    .offset(cursor * input.limit)
    .execute();
  return media;
}

export async function getTotal(ctx: ServiceContext, input: MediaGetAllInput) {
  const baseQuery = getBaseQuery(ctx, input);

  const countResult = await baseQuery
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .executeTakeFirst();
  const total = countResult?.total ?? 0;

  return total;
}
