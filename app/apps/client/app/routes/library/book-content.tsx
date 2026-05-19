import type { MetaFunction } from "react-router";
import { useLocation, useLoaderData } from "react-router";
import { $api } from "@repo/ui";
import { BookData } from "~/components/pages/library/book-content/book-data";
import { getUserOrNull } from "~/utils/auth";

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

        const { data: res, isLoading } = $api.useQuery("get", `/books/{id}`, {
                params: {
                        path: {
                                id: bookId,
                        },
                },
        });

        return (
                <main className="flex flex-col min-h-screen bg-charcoal">
                        <div className="mt-30">
                                <BookData res={res} isLoading={isLoading} user={user} />
                        </div>
                </main>
        )
}