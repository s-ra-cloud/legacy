# Great Conversation duplicate-record merges

## Scope and operation

The manual workflow is available below the Great Conversation graph through
**Merge proposals**, or from a selected person's/work's **Propose a merge**.
Select 2–8 original records of the same type. Choose a canonical identifier and
the sources of the display name/title, date, and authorship/classification.
Fields may remain explicitly unresolved. Compare complete source payloads and
current human-reviewed values, explain the identity judgment and optionally
provide a citation.

Enabled contributors submit proposals and may withdraw their pending proposals.
Only currently enabled, unbanned `ADMIN` accounts may approve, reject, or reverse.
This is separate from ordinary verification: no new moderation requirement is
added to person, work, or relation reviews.

Approval rechecks source hashes, review revisions, current proposal version,
and active merge membership under transactional locks. Changed comparisons
require a new proposal. Overlapping groups are not chained: reverse the earlier
merge before proposing a new grouping.

## Preservation

The overlay never updates/deletes CMS people, books, media, scholarly
contributions, relation endpoints, citations, source evidence, or existing human
verification rows. Each proposal stores the exact compared public source
payloads and reviewed values. An attributed event is appended for every proposal
and decision. Original identities remain searchable aliases; original record
review and merge history remain available in the inspector.

Graph projection redirects endpoints in memory only. Parallel directed links
created by a merge are consolidated after individual status/stance filters.
Each underlying connection remains individually inspectable and reviewable.
Opposite directions remain distinct. Conflicting visible stances are rendered
as mixed without rewriting any original classification. Internal links remain
in the dataset and are inspectable separately, but are not drawn as ordinary
connections or counted as neighbours.

Reversing changes the proposal status and appends an event; it does not rewrite
originals or restore an old snapshot. Contributions/reviews created after a merge
keep their explicit original identifiers and survive reversal. A merged
identity does not automatically verify any person, work, or relationship.

## Schema rollout

The additive migration creates only `gc_merge_proposals`, `gc_merge_events`
and their indexes/foreign keys. It has been applied to DEVELOPMENT.
Production schema changes must go through the reviewed Publish schema flow.
No schema mutation belongs in build/startup hooks, and no overwrite-data option
is necessary. Existing nullable user columns and other schemas are untouched.

## Verification

- `pnpm --filter @workspace/scripts test:gc` includes pure graph merge tests
  and existing graph/UI regressions.
- `pnpm --filter @workspace/scripts exec node --test great-conversation/merges-api.integration.mjs`
  tests real PostgreSQL transactions and production Hono handlers in a disposable
  development-only schema. Only auth/source boundaries are fixtures.
- No AI duplicate discovery is included in this manual iteration.
