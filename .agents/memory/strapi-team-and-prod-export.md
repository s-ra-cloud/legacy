---
name: Strapi team transform & production export path
description: Null-picture API crash on photo-free team members, and how prod content is delivered via a content-only encrypted export.
---

# Team API transform & null media

The `@repo/server` Strapi team service transforms each entry by mutating
`data.picture.url`. Any team member without a photo makes `picture` null and the
API throws `TypeError: Cannot read properties of null (reading 'url')`, which
surfaces in the client as "Failed to load team".

**Rule:** when a Strapi media field is optional in the schema, the server
transform must null-guard before touching `.url`, and the output schema must mark
that media `nullable().optional()`. Keep the three in lockstep: Strapi
`schema.json` (`required:false`), server transform, and server output zod schema.

# Production content delivery (no auto-sync)

Replit's publish flow migrates the DB *schema* dev→prod but NOT row data, so
Strapi *content* (team members, etc.) never syncs automatically — prod has its
own database. Symptom of the gap: a member added in dev (e.g. Mohamed Amine
Elhariri) is simply absent from the prod `strapi.teams` table.

The delivery artifact is the encrypted export at
`app/apps/strapi/export_20260518143539.tar.gz.enc` (git-lfs, ~55KB real blob on
disk), applied in prod by `scripts/run-strapi-import.sh`
(`strapi import --key oo --force --exclude files`). This import is now wired into
the BUILD phase of `scripts/build-prod.sh`, gated by env flag
`STRAPI_IMPORT_ON_START=1` (a shared env var, not a secret). Build phase is the
right place: it shares the deployment's DATABASE_URL (writes the live prod DB),
isn't subject to the startup health-check timeout, and runs once per deploy (no
autoscale multi-container race). It had been removed from build once before
(when the build-phase version unsafely lacked `--exclude files`).

**Why the flag, and the gotcha:** while `STRAPI_IMPORT_ON_START=1`, EVERY publish
re-imports and `--force`-overwrites prod content from the committed export —
which clobbers any edits made directly in the prod Strapi admin. Unset the flag
after a successful import if prod content should be editable in-admin. The export
is the source of truth: regenerate it (`strapi export --only content`) whenever
dev content changes that need to reach prod.

**Uploads live in a custom object-storage provider** (`config/plugins.ts`), not
local disk, so `strapi export` does NOT bundle image binaries — a regenerated
export is tiny (~50KB), not the legacy 82MB. Therefore:

- Regenerate content with `strapi export --only content`.
- The import MUST use `--exclude files`, or a `--force` import will run the asset
  phase and can delete the object-storage-backed images (binaries aren't in the
  archive to restore).

**Why:** the 82MB original export predates the object-storage migration; blindly
swapping it for a content-only export under the old (no `--exclude files`) import
flow risks wiping production media.
