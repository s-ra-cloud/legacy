# Human verification

## Inventory and identity boundary

Source records remain in their existing stores; the review tables are an additive
overlay, never a migration of the source records themselves.

* Strapi authors: firstName, lastName, gender, combined birthDeath, picture, expert,
  youtubeLink, books, document IDs and timestamps. Only the two name parts and
  birth date are reviewable. A combined life-date string remains intact; it is
  not parsed as a birth fact.
* Strapi books: BookTitle, BookSubtitle, author, OriginalPublicationDate,
  TranslatorName, TranslatingDate, SpecialThanks, submittedFiles, contributions,
  contributor metadata and technical IDs/timestamps. Only title and date are
  reviewable. Private contributor data is not copied into public history.
* Strapi contributions: connectionType, connectionSource, connectionNature,
  implicit classifications, explanation, book IDs/titles and paired excerpts.
  Relation reviews expose these public evidence fields, not contributor metadata
  or comments. Source status and evidence are unchanged.
* WAB snapshot and original CSV archive: archive authority identities, aliases,
  duplicate references, classification and occurrences remain in the original
  files. Snapshot nodes retain their source IDs; link evidence IDs, URLs,
  confidence, occurrence counts, summaries, stance and uncertainty remain intact.
* Biographical SQLite/JSON catalogue: dates, precision, source/evidence URLs,
  research notes/statuses, author classification, placement estimates and their
  assumptions remain unchanged. Placement estimates are never default verified
  birth dates. The inspector exposes the source biography alongside reviewed data.
* Publication research: publication/edition evidence, unknowns and research
  leads remain source evidence, not LEGACY human verification.
* Prisma accounts: the existing `Verification` table is authentication OTP
  storage. It is not used for content reviews.

Keys are `wab:person:<source-id>`, `wab:work:<source-id>`,
`cms:person:<document-id>` and `cms:work:<document-id>`. No name-based cross-source
merge occurs. Full archive names are displayed verbatim in originals and are
not heuristically split; the reviewer enters name parts, with null allowed for
a genuinely absent part.

Relation keys are `wab:relation:people|works:<sha256>` and
`cms:relation:people|works:<document-id>`. WAB hashes its canonical source,
target, original stance and sorted evidence IDs, never array offsets or names.
People and Works reviews are distinct. CMS direction follows bookA_id/bookB_id,
not the arbitrary order of populated books. The same append-only review tables
store relation reviews; no schema migration or source-data rewrite is needed.

The server-only compressed `gc-relation-evidence.json.gz` catalogue contains every
evidence ID referenced by either active graph. It is reproducibly extracted from
the user's uploaded WAB ZIP by `build_relation_evidence.py`, without executing
archive scripts. The API joins exact stored excerpts, AI rationale, work
identification basis, scope, archive/printed locators, URLs, retrieval status and
cached full archive remarks. These are source-supplied AI assertions, not new
human verification. Published/target passages may still be absent; a Nachlass
remark is not automatically the published passage in either linked work.
The catalogue is packaged outside `attached_assets` (excluded from publishing),
not loaded into the browser graph bundle. Missing catalogue/evidence is an error,
not silently accepted as empty evidence. Reviews snapshot this evidence.

## API contract

The shared runtime/type contract is `@repo/shared/gc-verification`.

* `GET /api/v1/gc-verifications?kind=person|work|relation`: public latest revisions for the
  graph overlay. An empty list means no human reviews, not an empty source graph.
* `GET /api/v1/gc-verifications/entity?key=...`: public original/current source
  payload, current reviewed values, source digest, revision and append-only
  history with attribution and per-revision source snapshots.
* `POST /api/v1/gc-verifications`: existing Better Auth session required; current
  database account must be enabled and not currently banned. Body includes key,
  kind, values, exact field coverage, expectedRevision, sourceToken and optional
  source. User ID, first/last name and timestamp are never accepted from clients.
  A mononym can occupy either name part; at least one is required. Unknown dates
  are explicitly reviewed as unknown, without a chronology year.
  Relation coverage is `evidence, connectionType, stance, assessment`; explanation
  is required. Assessments are supported, not_supported or insufficient_evidence.
  Connection type is explicit/implicit/unknown. The five stance values retain
  insufficient evidence separately from neutral. A supporting reference is optional.
* Writes serialize by entity using a transaction advisory lock. First submissions
  also race safely. Stale revisions/source digests return 409. The original
  payload is inserted once; each revision adds a source snapshot. History is
  append-only. URLs/references supplied by reviewers render as plain text.

Missing source/status reads are explicit errors, not assumed-unverified results.
Graph loading includes every page of scholarly contributions and the applicable
WAB stream. All source streams are available together. Status refresh occurs on
mount/focus, every minute, and after a successful submission.

## Visibility and review behavior

Both statuses start selected. Evidence uncertainty is a separate opt-in control.
Nodes and relations have independent human status. Verified-only draws reviewed
relations even if their endpoint records are not reviewed: endpoints remain
visible as context, without inheriting verification. Two verified endpoints never
verify a relation. A supported review applies its corrected stance/type as an
overlay; original AI evidence and confidence remain unchanged. Not-supported and
insufficient-evidence outcomes remain stored, use dashed insufficient-evidence
links, and require the existing uncertainty opt-in to draw. Their review stays
inspectable immediately after saving even if current filters hide the link.
Verified means human-reviewed, not necessarily supported; inspect its outcome.
The labelled isolated-node action explicitly sets the minimum to zero, includes
non-authors and reveals isolates; the normal People=1 / Works=3 defaults remain.
Full-screen review is inline inside the existing focus boundary. Escape closes
the editor before closing full screen. A review captures its revision when opened,
so background refresh cannot silently make an old edit overwrite a newer review.

## Migration and checks

The additive Prisma migration creates only the content-review tables and an
append-only revision guard. Existing sources and OTP verification are untouched.
Absence of a content revision is Unverified. Reapplying the migration never resets
reviews. No production/startup migration hook was added.

Commands:

```
pnpm --filter @workspace/scripts test:gc
pnpm --filter @workspace/scripts test:gc-ui
cd app && pnpm exec dotenv -e .env -- node --test ../scripts/great-conversation/verification-api.integration.mjs
cd app && pnpm --filter @repo/api exec tsc --noEmit
cd app && pnpm --filter @repo/client typecheck
```

The database integration test uses real PostgreSQL in a disposable, randomly
named schema. It runs the production Hono handlers with only session lookup and
external source reads replaced, and tests concurrent writes, attribution,
original preservation, history, migration reruns and rejection paths.

Existing client-wide typecheck blockers are outside this change: admin table
filter optional strings, notification user status type mismatch, optional about/
home team values, optional book-content-viewer book, D3 zoom extent tuple typing,
forgot-password Better Auth method, and missing reset-password route types.
The new verification files and API have no reported type errors.

## My Verifications and immutable amendments

My LEGACY Record includes an authenticated, database-backed personal history of
person, work **and relation** reviews. Every pre-feature revision remains a
separate original submission: same user/entity is not evidence of amendment
lineage. New reviews from the graph also remain independent submissions.

An original revision's ID is the stable submission ID. An amendment carries
`submission_id` (the original root) and `amends_revision_id` (the owner's previous
version). Both are nullable on roots. No existing row is updated, backfilled,
deleted or detached from its source snapshot. The original append-only trigger
continues to reject UPDATE and DELETE. The partial unique predecessor index
prevents forks; Prisma's model retains the self-relations, while this partial
index is maintained by the additive SQL migration.

Personal reads:

* `GET /api/v1/gc-verifications/mine` accepts `search`, `kind`, `from`, `to`,
  `cursor` and `limit` (1–50, default 10). It groups versions by explicit root,
  orders by original server creation time descending then root ID descending,
  and uses a bounded keyset cursor retaining microsecond precision.
  Dates are inclusive original-verification UTC dates, not modification dates.
  Search examines the owner's values, references and public evidence snapshots
  across every version, including superseded versions.
* `GET /api/v1/gc-verifications/mine/:submissionId` returns only an owned root's
  versions, snapshots and original provenance, alongside the globally current
  public review for comparison. It works if the live source is deleted or
  temporarily unavailable; editing is disabled and a source retry is offered.
* Both routes require a session and an enabled, unbanned account, return private
  no-store responses and expose no email or private CMS metadata. Client caches
  include user ID, are removed on account changes/unmount, and require a fresh
  matching session.

`POST /api/v1/gc-verifications/mine/:submissionId/amend` accepts
`{ review: VerificationInput, expectedOwnRevisionId }`. It checks the root,
entity and all chain ownership inside the entity-locked write transaction, then
checks the latest own predecessor and globally expected revision. The existing
source digest, coverage, account and same-origin protections apply. A save
appends a server-attributed/timestamped revision and advances the entity overlay
atomically; another reviewer's revision is never rewritten. Public graph editors
explicitly create separate submissions, not implicit edits.

The editor starts with the owner's latest values **and reference**. Other
reviewers' current values are separate, read-only context. A conflict preserves
the draft and disables save until explicit context reload; reload does not
replace corrections or automatically submit them. Failed refreshes and missing
sources also retain an open draft. A fresh, explicit save makes the amendment
the new current review under the unchanged latest-accepted-revision policy.

History links use the stable qualified `?entity=` key, select People or Works,
and open node/connection details. Hidden records explain the filter and offer
explicit reveal; ordinary graph defaults remain People=1, Works=3. Unavailable
records link back to stored personal history. Successful amendments invalidate
personal lists/details and public verification/graph overlays. Relations never
implicitly verify endpoint records.

### Additive rollout and checks

The reviewed migration
`20261112000000_gc_verification_amendments/migration.sql` only adds nullable
lineage columns, self-references and indexes. The development-only post-merge
setup applies it after the original verification migration. It has been applied
successfully to development via that setup. No production startup/build migration,
schema reset, dataset rewrite or authentication bypass is included. Production
schema changes remain subject to the existing reviewed Publish process.

Actual proxied development reads after setup/restart:
`GET /api/v1/gc-verifications?kind=person` returned 200 with `{data:[]}` before
browser-created test reviews; anonymous `GET /api/v1/gc-verifications/mine`
returned 401. These are read-endpoint checks, not inferred from migration success.

Expanded real postgres-js/Kysely disposable-schema API coverage includes legacy
roots, owner-only reads and amendments, forged IDs/entity keys, disabled/banned
accounts, concurrent writes, both own/global conflicts, preserved JSON objects,
original evidence/timestamps, missing/offline sources, date/type/search filters,
stable pagination and work/relation amendments. Rendered UI tests use the real
React Query runtime and cover browsing, account switches, prefill against another
reviewer, conflict recovery, missing sources and drafts surviving refresh failures.
Graph navigation tests cover hidden/unavailable persons/connections and Works
route selection. No unrelated datasets are modified by these regression suites.

The complete regression set passed serially (106 tests before the final
additional work/relation cases). The suites now run serially to avoid stalls
from simultaneous jsdom/D3 processes while the development services are running.
The API integration checks and setup-safety checks also passed. Shared and API
typechecks pass; the client-wide typecheck still reports existing unrelated
admin/form/notification/book-viewer/D3/auth type errors, with none in the changed
history, review or navigation files.

A real development browser journey used normal signup/sign-in, created an
accurate source-based person review, amended its reference, and confirmed both
versions after full reload and sign-out/sign-in. Mobile keyboard editing and
record-to-graph navigation with explicit hidden-record reveal were checked.
Work/relation amendments and conflicts were covered by the real-database and
rendered component tests, not by additional live browser reviews. Only the
throwaway reviewer's new development review rows were created; source data and
existing accounts were not changed.
