# Knowledge Tree production recovery review

## Core-only validation and guarded activation (2026-11-18)

This section supersedes implementation-status claims in the dated historical
sections below. It does **not** establish the current production database state
or claim a completed production restoration.

The administrator transfer page now includes **Validate and activate core data**.
Only the three pinned `locations`, `people`, and `connect` imports are required.
Publication and grant sources remain optional enrichment; the home page and
profiles distinguish not imported, partial, failed, complete and unavailable
reference coverage.

### Separate operational phases

1. **Publication/schema review:** deploy the application separately using the
   normal Publish review. This implementation introduces no new schema objects:
   it reuses nullable `public.knowledge_tree_imports.core_verification`. Existing
   recovery tables, browser jobs and token-search index must already be published.
   Do not choose overwrite data, reset, or a broad schema push.
2. **Data loading:** use the existing owner-authorized admin browser importer.
   Completed core files do not need to be downloaded or uploaded again.
3. **Core validation:** select Begin validation, then Continue validation. Keep
   the admin tab open; pause or closing the tab stops future requests after the
   current bounded batch. The saved checkpoint permits continuation after reload.
   This operates in the application's current database, not Agent's production
   inspection connection. Check the displayed environment before proceeding.
4. **Application activation:** only after validation passes, explicitly confirm
   Activate live. It switches all Knowledge Tree read endpoints together; it
   never copies, overwrites, or deletes the original dataset. Revert to original
   is a separate confirmed action. Where the original namespace is absent
   (as in an earlier production inspection), reverting intentionally leaves the
   graph unavailable until recovery is activated again.

### Validation and consistency

The server rechecks enabled ADMIN authorization, origin, the recovery schema and
the existing advisory lock for each action. Optimistic revision checks reject
stale or competing requests. The server scans primary-key batches (5,000 rows
for core counts/classification, 250 people for derived degrees), retaining
session-independent progress. Signed identifier ranges are handled, including
the real snapshot's connection ID zero.

Validation reconciles pinned per-file checksum/size/snapshot/count metadata and
actual core table counts. Byte-level checksum verification occurred in the
browser importer before data loading; this step does not re-download the files
or independently re-hash the database's entire contents. Every connection is
classified as valid mentorship, invalid/non-mentorship, self, or orphan, without
deleting original evidence. Recovery researchers' derived `connection_count`
values are refreshed, including zeros for isolated people, and their sum must
equal twice the number of valid mentorship rows.

The versioned JSON checkpoint/certificate and selected source live on the pinned
locations import record. They bind to all three core ledger revisions and the
pinned manifest. Completion alone does not activate anything. Supported browser
core writes invalidate the shared checkpoint; core writes are refused while
recovery is active. Optional reference writes do not invalidate core validation.
The historical owner CLI refuses writes after browser verification metadata
exists, rather than modifying data beneath its certificate.

Read requests use a single repeatable-read transaction and allowlisted table
mapping. An active but stale certificate yields an explicit unavailable response,
never a silent fallback or mixed source. Recovery name search uses the existing
GIN token index for longer queries and prefix indexes for two-character queries,
with bounded candidates and a short statement timeout. Client caches include the
selected source so a switch does not reuse the other source's cached profiles or
graphs. Optional reference-query failures are isolated by savepoints.

This protects application-controlled writes. Direct database edits bypass that
contract: an operator must revert the source, invalidate verification and rerun
validation before reactivation. No triggers, extra roles, production credentials,
startup imports, startup DDL, or unattended worker were introduced.

### Verification

Development integration tests exercise the real services and public route
handlers against session-local temporary tables, leaving original/recovery data
untouched. They cover core-only reads through every endpoint, signed/zero IDs,
row classification, isolated degrees, resume, stale requests/certificates,
optional-reference failures and source reversal. HTTP tests cover authentication,
revocation/roles, origin enforcement and input validation. Component tests cover
the explicit validation loop, pause, confirmation and honest reference wording.
These tests do not substitute for owner-authorized production validation after
publishing.

## Administrator browser-driven transfer (2026-11-13)

The owner approved browser-driven imports instead of an external worker
integration. The new `/dashboard/knowledge-tree` page is reached from the users
administration page. It requires an enabled administrator and accepts the eleven
original, checksum-pinned `.csv.gz` archives, in snapshot order. This is not an
arbitrary CSV uploader and does not replace existing data.

The dedicated browser worker hashes each compressed file, streams gzip/CSV
parsing, and sends at most 1,000 rows and approximately 1 MiB of data per request.
Each server request rechecks administrator access, same-origin protection,
schema readiness, the reviewed database safety ceiling, source metadata and
checkpoint. A transaction-scoped recovery lock covers inserts and their
checkpoint; duplicate keys are not overwritten. Replaying the last committed
batch returns its existing checkpoint. Untracked recovery data or mismatched
source metadata is refused. No CSV bytes are stored in PostgreSQL.

Keep the tab open and the computer awake. Pause waits for a current batch;
closing the page stops future requests. To resume, reselect the same archives:
the worker validates the checksum again and scans to the saved row. File
completion means pinned per-file insertion counts reconciled; it does not
establish full graph integrity, refresh connection degrees, set a core readiness
certificate, or switch the website to recovery tables.

The **Original** download links issue administrator-authorized, short-lived
downloads from the existing private snapshot archive. They are the source format
as originally supplied, NOT generated exports of later database changes.

### Schema publication remains separate

Development now also contains `public.knowledge_tree_browser_jobs`, retaining the
administrator identity, chosen capacity ceiling, header digest and last batch
digest. Its additive source is
`app/packages/db/knowledge-tree/browser-import-schema.sql`. No data-loading or
schema hooks were added to website startup/build.

The current Publish review proposes three additions only: this table, nullable
`core_verification`, and the token-search GIN index. It reports no drops,
truncations, unrelated alterations or structural data-loss warnings. Review
again before publication and never choose overwrite data.

### Verification and remaining recovery work

Automated tests cover original CSV parsing, pinned manifest identity, incremental
checksums, actual locations-archive streaming, pause/resume, bounded requests,
invalid-file rejection, authentication/CSRF denial, atomicity, idempotent replay
and storage/checkpoint guards. Database tests use session-local temporary tables
through postgres-js, not original or recovery dataset tables.
The 24 focused tests passed. Authenticated development requests returned download
redirects for all eleven archives. A signed-in browser pass confirmed the admin
navigation, desktop/mobile layout, refresh, invalid-file and capacity/confirmation
gates. It did not submit a live import: its request interception could not cover
dedicated workers safely. Worker pause/resume was exercised with the real
locations archive in the automated worker harness; database commits were tested
separately against temporary tables. Do not describe this as a completed
end-to-end production import. The disposable test account was removed.

The original development import ledger retains eleven completed imports. No
production import or application cutover was performed. The existing public
Knowledge Tree API still reads the original namespace: guarded cutover and core
integrity/degree verification remain separate work before live restoration can
be claimed. Earlier owner-run instructions below are historical alternatives,
not prerequisites for the new browser workflow.

## Main-session inspection and owner execution gate (2026-11-13)

This section supersedes historical observations below; it is not a completed
restoration. Approved read-only production queries currently find no
`knowledge_tree` namespace, zero import records, zero recovery researchers and
zero recovery connections. Database usage is 16,891,904 bytes; this does not
establish quota or available import headroom. The six recovery tables were
established by the preceding production inspection.

The current Publish diff contains exactly two additive statements: a nullable
`public.knowledge_tree_imports.core_verification jsonb` column and the unfiltered
`knowledge_tree_people_tokens` GIN index on
`to_tsvector('simple'::regconfig, full_name)`. Both are still absent in production.
There are no proposed removals, truncations or unrelated alterations.
Development's original import ledger still contains eleven completed records
with the pinned source checksums; this is ledger evidence, not a new recount.

Main currently includes the additive schema source and the earlier owner-run
utility, but not the later guarded-cutover implementation described for the
separate task working copy. No accessible local branch/worktree contains that
implementation. The current main utility neither requires nor writes the
`core_verification` record; the API still hardcodes the original namespace and
uses substring search for longer queries. Do not present this combination as
ready for production import and cutover. Obtain and inspect the prepared patch
before recreating or replacing that work.

Official documentation consulted in this session describes production connection
details in **Database → Production → Settings**, for owner-operated external
PostgreSQL clients. This is distinct from Agent's read-only production replica.
An authorized external server is an alternative to the owner's personal computer.
There is no requirement to configure a Mac. Account-specific visibility, a
direct/session-preserving TLS endpoint, write/TEMP permissions and actual storage
capacity must still be confirmed by the owner; documentation alone does not
verify those properties for this project. Never request the URL in chat or
retrieve it through Agent.

Keep these stages separate:

1. Review/publish only the two additive schema changes, without overwrite data;
   then inspect production again.
2. On an owner-authorized external runner, perform a read-only preflight first,
   with verified capacity, session affinity and pinned core files. Only after
   the prepared utility is reviewed may the owner explicitly apply the
   locations/people/connections import and record verified core readiness.
3. Independently release the tested, guarded application selector and indexed
   search. Confirm live stats/search/profile/network/path and unrelated routes
   before calling recovery complete. Large reference shards remain a later,
   capacity-reviewed operation.

No files need downloading and no local installation should be requested before
the owner execution mechanism and prepared patch are established. This
inspection performed no database writes, publication or configuration changes.

## Owner-run alternative (2026-11-07)

The user subsequently approved replacing the separately hosted worker with a
one-time, resumable owner-run importer. See
`scripts/knowledge-tree/OWNER-RECOVERY.md` for requirements and commands.
`owner_recovery.py` is a data-only tool for the owner's authorized computer/server:
it refuses the Replit workspace and website runtime, defaults to read-only
preflight, requires target-fingerprint confirmation for writes, checks pinned
local sources and schema, uses one database session for locks and writes, commits
each batch with its checkpoint, and reconciles counts. No credentials were
requested, extracted, printed, or stored by the agent.

This preparation does not deploy a worker, publish tables, run production imports
or change the API's data source. Source exports must be copied securely to the
owner's machine. Application cutover, production search performance and live
verification remain outstanding; do not call the full recovery complete.

## Worker preparation after project migration (2026-11-07)

Preparation is incomplete; no worker was deployed and no production import ran.
The original development import records remain readable. Their eleven pinned
filenames, checksums, sizes and reconciliation counts are recorded in
`scripts/knowledge-tree/recovery-sources.json`, in core-first order. Validation
helpers reject mismatched checksums/sizes, unsafe names, duplicate or missing
shards, invalid counts and symlink sources. Ten importer/source-validation tests
pass, and the original local locations archive matches its pinned SHA256.
Private App Storage downloads still need verification.

The available artifact creation interface lists only expo, design-system,
openscad, react-vite, slides and video-js. It does not expose a scheduled-worker
type or a documented independent scheduling field. Documentation search describes
shared-database scheduled artifacts, but that does not establish an executable
configuration through the available interface. Do not create a fake web artifact
or put a worker in the website's run command to claim independent hosting.
Resolve the supported registration/deployment interface before configuring it.

A fresh read-only production database request failed with
`Production database access requires an authenticated user`. Consequently the
production schema, capacity and database identity could not be revalidated.
Do not bypass this with connection-string extraction. Production observations
below are historical until authenticated access is restored.

Development preview startup initially failed because orphaned pre-migration
MinIO/nginx/API/client processes still occupied their old ports. Only those
identified local processes were terminated; the managed Legacy workflow now
starts. The development stats endpoint returns HTTP 200 with the original full
dataset. No application code, website hosting target, or production data changed.

Remaining work includes the worker runtime itself, storage download checks,
single-session import locking, interruption/resume tests, core-readiness gating,
extension-free production search, API/UI cutover and live publication validation.
The source manifest and passing validation tests are not a completed worker.

## Additive public-schema recovery staging (2026-11-07)

The user authorized testing a public-schema alternative. Six **empty** staging
tables named `public.knowledge_tree_*` now exist in development alongside the
untouched original dataset. Their source is
`app/packages/db/knowledge-tree/public-schema-candidate.sql`.

Publish now detects **12 additive statements: six CREATE TABLE and six CREATE
INDEX**, all restricted to these new tables. Its review reports no destructive
changes, backward-compatibility warnings, removals, or truncations. This resolves
the schema-discovery obstacle for the alternative, not the full data recovery.
All 12 generated statements also executed successfully against temporary
development tables inside a transaction that was rolled back. The existing
development Knowledge Tree page still renders with its original dataset.

Production has no `pg_trgm` extension. The staging schema deliberately omits the
trigram index because Publish did not include extension installation. The
original development namespace and its trigram index remain intact. The staging
tables retain ordinary prefix, graph, and reference indexes; substring-search
performance must be addressed before an application cutover.

No production writes or publication occurred. Application queries and the
development importer still target the original namespace. **Publishing this
schema alone will not restore the live module.** Required next stages are
verification of the published staging tables, a separately reviewed data-only
import, and a tested application/importer cutover. Never select overwrite data.
The full dataset must not be duplicated locally merely to test discovery.

## Initial verified state (before staging)

- Deployment metadata identifies `https://legacy-project.io` as the public,
  successfully built deployment.
- Live `GET /api/v1/knowledge-tree/stats` returns HTTP 503.
- Read-only production catalog inspection finds **no `knowledge_tree` namespace**.
  Existing application schemas include `public` (8 tables) and `strapi` (57 tables).
- Development has all six Knowledge Tree tables and all eleven completed imports.
- The publishing schema-review callback succeeds but reports **no diff**,
  no SQL statements, no structural data loss, and no objects to remove/truncate.
  This does **not** demonstrate that the missing namespace will be created.
  Do not describe the current empty review as an adequate recovery migration.

## Data available for controlled recovery

| Dataset | Imported development rows |
| --- | ---: |
| Researchers | 896,262 |
| Connections | 1,850,796 |
| Institutions | 50,771 |
| Publication associations | 103,020,372 |
| Grant associations | 6,954,331 |

One publication association was rejected for a missing researcher identifier.
Original compressed snapshot files were archived privately in App Storage.
Development counts are **not** production counts.

## Safety boundary and remaining blocker

No production writes, schema changes, publishes, or database replacements were
performed in this review. The user's authorization covers controlled recovery,
not deletion of unrelated data.

The agent's managed-production SQL interface is read-only. Production schema
changes must use the supported publishing/schema-management surfaces, not a
custom migration script, deploy/build hook, startup DDL, or a connection-string
workaround. Publishing itself requires the user's action.

The original namespace remains omitted, but the additive public-schema alternative
above is now represented in the Publish review. Use that supported path rather
than assuming the only route is a manual schema operation. Creating staging
tables does not itself populate them or redirect the application.
The agent must verify the resulting catalog, permissions, and schema before
attempting data-only recovery. Do not blindly republish an empty diff.

## Subsequent recovery sequence

1. Recheck the production schema diff and reject any unrelated drop, truncate,
   replacement, or removal. Never select **overwrite production data**.
2. Verify all six Knowledge Tree relations, expected columns/keys/indexes,
   required extension support, application-role permissions, and storage capacity.
3. Inspect production import records and compare source checksums before loading.
   Do not assume it is safe to replay development progress.
4. Use a separately reviewed, explicitly production-authorized **data-only**
   import path, restricted to the Knowledge Tree tables, with the development
   guard retained, checksum validation, bounded streaming batches, advisory
   locking, idempotency, checkpoints, and capacity protection.
5. Recover core genealogy first. Verify real statistics/search/profile/network
   responses before loading large reference shards. Report partial coverage
   truthfully until every source has completed.
6. Verify unrelated application data and CMS content remain intact; verify the
   published browser experience and persistence after a normal release.

## Platform references consulted

- https://docs.replit.com/features/data-and-storage/publish-database-changes
- https://docs.replit.com/features/data-and-storage/development-and-production
- https://docs.replit.com/features/data-and-storage/work-with-your-data

This is an observation record and recovery procedure, not executable production
DDL or a statement that the recovery is complete. Recheck live state before acting.
