import { handleFilterString } from "@repo/db";
import { parseFilters } from "@repo/shared";
import type { ServiceContext } from "../../../context.js";
import type { UserManyInput } from "../schema/input.js";

function getBaseQuery(ctx: ServiceContext, input: UserManyInput) {
  const filter = parseFilters(input);
  return ctx.db
    .selectFrom("users as u")
    .$if(!!filter?.id, (qb) => handleFilterString(qb, "u.id", filter?.id))
    .$if(!!filter?.name, (qb) => handleFilterString(qb, "u.name", filter?.name))
    .$if(!!input.q, (qb) =>
      qb.where((eb) => eb.or([eb("u.email", "ilike", `%${input.q}%`)])),
    );
}

export async function getAll(ctx: ServiceContext, input: UserManyInput) {
  const cursor = input.cursor - 1;
  const users = await getBaseQuery(ctx, input)
    .selectAll("u")
    .limit(input.limit)
    .offset(cursor * input.limit)
    .orderBy("u.createdAt", "desc")
    .execute();

  return users;
}

export async function getTotal(ctx: ServiceContext, input: UserManyInput) {
  const baseQuery = getBaseQuery(ctx, input);

  const countResult = await baseQuery
    .select(({ fn }) => fn.countAll<number>().as("total"))
    .executeTakeFirst();
  const total = countResult?.total ?? 0;

  return total;
}
