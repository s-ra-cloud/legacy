import type { MetaFunction } from "react-router";
import { useLocation } from "react-router";
import { Books } from "~/components/pages/library/author-data/books-list";
import { $api } from "@repo/ui";
import { Expert } from "~/components/pages/library/author-data/author-expert";

export const meta: MetaFunction = () => [
  { title: "Author Library – Legacy" },
  {
    name: "description",
    content:
      "Explore an author's works in the Legacy Library — read foundational texts and discover connections across the history of ideas.",
  },
];

export default function AuthorLibraryPage() {
        const location = useLocation();
        const id = location.pathname.split("/").pop() || "";
        const authorId = id.split("-")[0] || "";

        const { data: res, isLoading } = $api.useQuery("get", `/authors/{id}`, {
                params: {
                        path: { id: authorId },
                },
        });

        return (
                <main className="flex flex-col">
                        {/* ── Band 1 · Dark – author hero + books ── */}
                        <section className="relative overflow-hidden bg-charcoal pt-20">
                                {/* Great-Conversation-style centre glow */}
                                <div
                                        aria-hidden
                                        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-3xl"
                                />
                                {/* Dot pattern – same as GreatConversation section */}
                                <div
                                        aria-hidden
                                        className="pointer-events-none absolute inset-0 opacity-20"
                                        style={{
                                                backgroundImage:
                                                        "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(197,160,89,0.05) 1px, transparent 1px)",
                                                backgroundSize: "60px 60px, 90px 90px",
                                        }}
                                />
                                <div className="relative z-10 px-4 sm:px-8 lg:px-12">
                                        <Books res={res} isLoading={isLoading} id={id} />
                                </div>
                        </section>

                        {/* ── Band 2 + 3 · Light expert bio → Dark video ── */}
                        <Expert res={res} isLoading={isLoading} />
                </main>
        );
}
