import { GreatConversationProposalsPage } from "~/components/admin/pages/great-conversation/proposals";
import { getUserOrRedirect } from "~/utils/auth";
import type { Route } from "./+types";

export async function loader({ request }: Route.LoaderArgs) {
  await getUserOrRedirect(request, ["ADMIN"]);
  return null;
}

export function meta() {
  return [{ title: "Scholar connection proposals | LEGACY" }];
}

export default function AdminGreatConversationRoute() {
  return <GreatConversationProposalsPage />;
}
