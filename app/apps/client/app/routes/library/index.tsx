import Authors from "~/components/pages/library/authors";
import { AuthorsList } from "~/components/pages/library/authors-list";

export default function LibraryIndexPage() {
	return (
		<main className="flex flex-col min-h-screen bg-charcoal">
			<Authors />
			<AuthorsList />
		</main>
	)
}