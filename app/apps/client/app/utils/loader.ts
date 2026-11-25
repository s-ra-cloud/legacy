import type { ServiceContext } from "@repo/server";
import type { QueryClient } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";

export async function buildLoaderResponse<
  QC extends QueryClient,
  E extends Record<string, unknown>,
>(queryClient: QC, ctx: ServiceContext, extra?: E) {
  return { dehydratedState: dehydrate(queryClient), user: ctx.user, ...extra };
}

// this is used to samplify repeated code in
// simple loader functions
// don't use this for complex loader functions
export function params<Q>(q: Q) {
  return {
    params: {
      query: q,
    },
  };
}
