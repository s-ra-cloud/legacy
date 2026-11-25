import type { MetaFunction } from "react-router";
import Authors from "~/components/pages/library/authors";
import { AuthorsList } from "~/components/pages/library/authors-list";

export const meta: MetaFunction = () => [
  { title: "NeoAlexandria – Legacy" },
  {
    name: "description",
    content:
      "Browse NeoAlexandria — a curated collection of foundational works and their authors, spanning philosophy, science, literature, and more.",
  },
];

export default function LibraryIndexPage() {
        return (
                <main className="flex flex-col min-h-screen bg-charcoal">
                        <Authors />
                        <AuthorsList />
                </main>
        )
}