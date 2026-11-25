import { AdminUsersCreatePage as AdminUsersCreatePageComponent } from "~/components/admin/pages/users/create/page";
import { getUserCtxOrRedirect } from "~/utils/auth";
import type { Route } from "./+types";
import { buildLoaderResponse } from "~/utils/loader";
import { HydrationBoundary, QueryClient } from "@tanstack/react-query";

export async function loader({ request }: Route.LoaderArgs) {
  const qc = new QueryClient();
  const ctx = await getUserCtxOrRedirect(request, ["ADMIN"]);
  return buildLoaderResponse(qc, ctx);
} 

export default function AdminUsersCreatePage({ loaderData }: Route.ComponentProps) {
  return (
    <HydrationBoundary state={loaderData.dehydratedState}>
      <AdminUsersCreatePageComponent />
    </HydrationBoundary>
  );
}
