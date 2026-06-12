import { userService } from "@repo/server";
import { HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { AdminUsersEditPage } from "~/components/admin/pages/users/edit/page";
import { $api } from "@repo/ui";
import { getUserCtxOrRedirect } from "~/utils/auth";
import { buildLoaderResponse } from "~/utils/loader";
import type { Route } from "./+types/edit";

export async function loader({ request, params }: Route.LoaderArgs) {
  const qc = new QueryClient();
  const ctx = await getUserCtxOrRedirect(request, ["ADMIN"]);
  const userId = params.userId;

  await qc.prefetchQuery({
    queryKey: $api.queryOptions("get", "/users/{id}", {
      params: {
        path: {
          id: userId,
        },
      },
    }).queryKey,
    queryFn: () => userService.get(ctx, { id: userId }, {}),
  });

  return buildLoaderResponse(qc, ctx);
}

export default function AdminUsersEdit({
  params,
  loaderData,
}: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <main className="flex min-h-screen flex-col bg-charcoal">
        <div className="mt-20 mb-10">
          <AdminUsersEditPage userId={params.userId} />
        </div>
      </main>
    </HydrationBoundary>
  );
}
