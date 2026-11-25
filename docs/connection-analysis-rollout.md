# Connection analysis rollout

The reviewed development migration adds only three nullable columns to
`strapi.gc_contributions`: `connection_uncertain` (boolean), `origin_comment`
and `supporting_reference` (text). There are no defaults or data updates.
Strapi's `connection_nature` varchar accepts the additional `neutral` and `mixed`
values; keep `neutral / unsure` unchanged and visibly ambiguous.

Apply the narrow SQL through the existing development/post-merge process.
Before Publish, review the actual development-to-production diff: these three
columns are the intended additions, not table replacements or unrelated schema
changes. Do not run production DDL in startup/build or broadly push the schema.

General comment continues to use `explainConnection`, preserving historical
explanations without a second competing input. Missing historical uncertainty
remains null. New drafts explicitly send false for an unchecked checkbox.
Position is nullable; no stance is inferred from certainty or citations.

Creation fingerprint input includes only fields actually supplied. Never add
defaults before fingerprinting: pre-upgrade retries must retain their original
fingerprint. Corrections retain original creation keys/fingerprints and use the
locked record's saved version. Older correction clients retain omitted additive
fields; older revision snapshots can omit them without claiming certainty.

Supporting references are rendered as escaped text, linking only HTTP(S) URLs.
No source is fetched or verified automatically.
