import type { MetaFunction } from "react-router";
import { useLocation, useLoaderData } from "react-router";
import { $api } from "@repo/ui";
import { BookData } from "~/components/pages/library/book-content/book-data";
import { getUserOrNull } from "~/utils/auth";
import { useSlowLoading } from "~/lib/query-status";

interface LoaderArgs {
        request: Request;
}

export async function loader({ request }: LoaderArgs) {
        const user = await getUserOrNull(request);
        return { user };
}

export const meta: MetaFunction = () => [
  { title: "Book – Legacy" },
  {
    name: "description",
    content:
      "Read this work in the Legacy Library — a curated selection of foundational texts from history's greatest thinkers.",
  },
];

export default function BookContentPage() {
        const { user } = useLoaderData<typeof loader>();
        const location = useLocation();
        const id = location.pathname.split("/").pop() || "";
        const bookId = id.split("-")[0] || "";

        const { data: res, isLoading, error, refetch, isFetching } = $api.useQuery("get", `/books/{id}`, {
                params: {
                        path: {
                                id: bookId,
                        },
                },
        });
        const slowLoading = useSlowLoading(isLoading);

        return (
                <main className="relative flex min-h-screen flex-col overflow-hidden bg-charcoal pt-20">
                        <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-20"
                                style={{
                                        backgroundImage:
                                                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
                                        backgroundSize: "60px 60px, 90px 90px",
                                }}
                        />
                        <BookData
                                res={res}
                                isLoading={isLoading}
                                error={error}
                                user={user}
                                slowLoading={slowLoading}
                                onRetry={() => refetch()}
                                retrying={isFetching}
                        />
                </main>
        )
}