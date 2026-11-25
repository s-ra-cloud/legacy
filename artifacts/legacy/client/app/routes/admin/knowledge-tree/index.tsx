import { KnowledgeTreeTransferPage } from "~/components/admin/pages/knowledge-tree/page";
import { getUserOrRedirect } from "~/utils/auth";
import type { Route } from "./+types";

export async function loader({ request }: Route.LoaderArgs) {
  await getUserOrRedirect(request, ["ADMIN"]);
  return null;
}

export function meta() {
  return [{ title: "Knowledge Tree data | Legacy" }];
}

export default function AdminKnowledgeTreeRoute() {
  return (
    <main className="flex min-h-screen flex-col bg-charcoal">
      <div className="mt-20 mb-10">
        <KnowledgeTreeTransferPage />
      </div>
    </main>
  );
}
