# Owner-run Knowledge Tree recovery

This is a **one-time data import**, not a deployment worker, database migration,
or complete website cutover. It creates no persistent schema, deletes nothing,
and writes only the six `public.knowledge_tree_*` recovery tables.
The original development-only importer and website queries remain unchanged.

## Before starting

1. Review Publish's actual SQL. It must create only the approved Knowledge Tree
   tables/indexes, with no unrelated drops, truncations or replacements. Never
   choose **overwrite production data**. The importer refuses missing tables.
2. Obtain the production database connection details as the authorized project
   owner. Do not paste credentials into chat, command arguments or source files.
   The script prompts for the URL invisibly; alternatively use a local secret
   manager to provide `KT_RECOVERY_DATABASE_URL` securely.
3. On your own computer or authorized server, install Python 3.11+ and copy the
   entire `scripts/knowledge-tree` directory. Keep your machine running; disabling
   sleep helps. Do not run this in the Replit website, build, or workspace shell.
4. Place the original compressed exports in a local `recovery-data` directory.
   Use the exact filenames listed in `recovery-sources.json`, obtained from the
   uploaded exports or private App Storage snapshot. Do not make the bucket public.
   For core recovery you need only locations, people and connect. For full recovery
   you need all eleven files, roughly 1.8 GB compressed. The script does not fetch
   private App Storage objects or request new storage credentials.
5. Review production storage capacity and choose a safety ceiling in GiB,
   **below the database's actual capacity**, leaving room for ongoing site writes.
   The full dataset may use approximately 18 GB in addition to existing data and
   transient overhead. The ceiling is checked between batches, not a hard quota;
   each batch, indexes, WAL and concurrent application writes can exceed it.
   Start with core-only recovery. Do not invent a capacity value.

The URL must connect directly or through a **session-preserving** connection,
not a transaction-pooling endpoint. Advisory locks and temporary tables require
session affinity. Remote connections require TLS. Use the same connection URL
for preflight and apply. The target fingerprint binds host, port, database and
username; it is not proof of authorization or a substitute for choosing production.

## Install on the owner's machine

From the copied directory:

```bash
python3 -m pip install -r requirements-owner.txt
```

This dependency is separate from the website; no website package upgrade is needed.

## Read-only preflight

Replace `REVIEWED_LIMIT_GIB` with the numeric safety ceiling you reviewed:

```bash
python3 owner_recovery.py \
  --files ./recovery-data \
  --scope core \
  --max-database-gib REVIEWED_LIMIT_GIB
```

Enter the production connection URL at the hidden prompt. This opens the
connection in read-only mode, verifies the schema, existing import metadata,
local source hashes and capacity, and prints a non-secret `targetFingerprint`.
If anything fails, **stop**; do not bypass the refusal or alter production schema
with shell commands.

## Import the core dataset

Use the fingerprint from the successful preflight, not an example value:

```bash
python3 owner_recovery.py \
  --files ./recovery-data \
  --scope core \
  --max-database-gib REVIEWED_LIMIT_GIB \
  --apply \
  --confirm-target FINGERPRINT_FROM_PREFLIGHT
```

The importer processes locations, researchers and connections, checks their
counts against the pinned manifest, then refreshes connection counts. Each batch
and checkpoint commits atomically. Ctrl+C or interruption retains committed work;
rerun the same command to resume. It rescans compressed input to the checkpoint
without reinserting previous rows. Changed source hashes are refused.

A lock on the same connection as all writes prevents simultaneous recovery runs.
Connection loss aborts the process with no automatic reconnect. Do not run the old
development importer against production or run multiple import tools concurrently.

## Optional full reference recovery

After checking core results and capacity, repeat preflight with `--scope all`,
then repeat apply with `--scope all`. Completed files are checked and skipped;
publication shards load in their pinned order, followed by grants.
The final totals are reconciled. The one known source association without a
researcher ID is rejected, as recorded in the manifest; additional rejects abort.

## Website cutover remains a separate step

Successful imports **do not automatically switch the website**. The API currently
reads the original custom namespace. Before cutover, implement and test:

- Public-table selection guarded by verified core readiness.
- Honest partial-reference coverage while later imports are running.
- Extension-free indexed search, because the production schema lacks pg_trgm.
- Real production stats/search/profile/network/path checks, plus unchanged
  authentication, CMS and unrelated data.

Do not interpret a successful preflight, publication, or core import as a complete
live recovery. The production schema and capacity could not be rechecked from the
agent session when this utility was prepared.

## Verification performed during preparation

Tests cover checksum/size validation, target/TLS guards, core-first source order,
transaction rollback on COPY failure, interruption after a committed batch,
resume/idempotency, concurrent lock exclusion, lock release after disconnect,
connection-loss refusal, and budget exhaustion. Database tests use session-local
temporary development tables only; they do not load the production dataset.
