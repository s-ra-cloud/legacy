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

There is no automated dev→production Strapi content sync wired into deploy. The
delivery artifact is the encrypted export at
`app/apps/strapi/export_20260518143539.tar.gz.enc` (git-lfs), imported in prod by
`scripts/run-strapi-import.sh` (`strapi import --key oo --force`). Running that
import in prod is a separate task; code + schema changes deploy automatically but
content changes only go live when the import actually runs.

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
