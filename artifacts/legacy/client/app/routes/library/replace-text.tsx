import { useLoaderData, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { booksService } from "@repo/server";
import { ReplaceTextForm } from "~/components/pages/library/contribute/replace-text-form";
import { getUserCtxOrRedirect } from "~/utils/auth";

export async function loader({ request, params }: { request: Request; params: { bookId?: string } }) {
  const ctx = await getUserCtxOrRedirect(request, ["ADMIN"]);
  const id = params.bookId?.split("-")[0];
  if (!id) throw new Response("Book not found", { status: 404 });
  const book = await booksService.get(ctx, { id });
  return { book };
}

export const meta = () => [{ title: "Replace library text – Legacy" }];

export default function ReplaceTextPage() {
  const { book } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const back = () => navigate("..", { relative: "path" });
  return (
    <main className="min-h-screen bg-charcoal px-4 pt-28 pb-16">
      <section className="mx-auto max-w-3xl border border-charcoal/10 bg-paper p-6 sm:p-10">
        <h1 className="mb-6 font-serif text-3xl text-charcoal">Replace library text</h1>
      <ReplaceTextForm key={book.documentId} book={book} onCancel={back} onSuccess={async () => {
        // The generated detail keys and contributor/list keys all contain books.
        await queryClient.invalidateQueries({
          predicate: (query) => JSON.stringify(query.queryKey).toLowerCase().includes("book"),
        });
        back();
      }} />
      </section>
    </main>
  );
}
