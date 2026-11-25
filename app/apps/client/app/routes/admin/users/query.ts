import { userManyInputSchema } from "@repo/server/client";
import { excludeNullParams } from "~/utils/nuqs/clean-params";

/** Apply schema defaults so loader prefetch and client useQuery share the same query key. */
export function parseUserManyQuery(raw: Record<string, unknown>) {
  return userManyInputSchema.parse(excludeNullParams(raw));
}
