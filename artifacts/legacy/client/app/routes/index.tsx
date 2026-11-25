import { redirect } from "react-router";

export async function loader() {
	throw redirect("/home");
}

export default function IndexPage() {
	// This component should never render as the loader always redirects
	return null;
}
