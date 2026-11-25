type Attribution = {
	contributorName?: string | null;
	contributorInstitution?: string | null;
};

function publicText(value: string | null | undefined) {
	const text = value?.trim();
	return text && !text.includes("@") ? text : null;
}

export function ContributorAttribution({ contributor, comment = false }: {
	contributor: Attribution;
	comment?: boolean;
}) {
	const name = publicText(contributor.contributorName) || "Contributor";
	const institution = publicText(contributor.contributorInstitution);
	if (comment) return <>
		<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-charcoal/70">{name}</p>
		{institution && <p className="mt-1 font-serif text-xs italic text-charcoal/45">{institution}</p>}
	</>;
	return <div className="border-t border-charcoal/10 pt-4">
		<p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold/80">Contributor</p>
		<p className="mt-1 font-serif text-sm text-charcoal/65">{[name, institution].filter(Boolean).join(", ")}</p>
	</div>;
}
