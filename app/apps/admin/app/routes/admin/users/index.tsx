import { userService } from "@repo/server";
import { userManyInputSchema } from "@repo/server/client";
import { HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { createLoader } from "nuqs";
import { AdminUsersPage } from "~/components/admin/pages/users/page";
import { $api } from "@repo/ui";
import { getUserCtxOrRedirect } from "~/utils/auth";
import { buildLoaderResponse, params } from "~/utils/loader";
import { zodToFilters } from "~/utils/nuqs/zod-to-filters";
import { zodToNuqs } from "~/utils/nuqs/zod-to-nuqs";
import type { Route } from "./+types";
import { parseUserManyQuery } from "./query";

export const userManyInputNuqs = zodToNuqs(userManyInputSchema);
export const userManyInputFilters = zodToFilters(userManyInputSchema);
const loadSearchParams = createLoader(userManyInputNuqs);

export async function loader({ request }: Route.LoaderArgs) {
  const qc = new QueryClient();
  const ctx = await getUserCtxOrRedirect(request, ["ADMIN"]);
  const query = parseUserManyQuery(loadSearchParams(request));
  await qc.prefetchQuery({
    queryKey: $api.queryOptions("get", "/users", params(query)).queryKey,
    queryFn: () => userService.getAll(ctx, query),
  });
  return buildLoaderResponse(qc, ctx);
}

export default function AdminUsersIndex({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <AdminUsersPage />
    </HydrationBoundary>
  );
}
