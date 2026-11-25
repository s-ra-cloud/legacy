# Knowledge Tree production recovery review

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
