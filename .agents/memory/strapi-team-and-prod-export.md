---
name: Strapi optional media transform & prod content delivery
description: Null-picture API crash on photo-free team members, and how Strapi content must (and must not) be pushed to production.
---

# Team API transform & null media

The `@repo/server` Strapi team service transforms each entry by mutating
`data.picture.url`. Any team member without a photo makes `picture` null and the
API throws `Cannot read properties of null (reading 'url')`, surfacing in the
client as "Failed to load team".

**Rule:** when a Strapi media field is optional in the schema, the server
transform must null-guard before touching `.url`, and the output schema must mark
that media nullable/optional. Keep three in lockstep: Strapi `schema.json`
(`required:false`), the server transform, and the server output zod schema.

# Production content delivery (no auto-sync)

Replit's publish flow migrates the DB *schema* dev→prod but NOT row data, and
**prod has its own separate database**. So Strapi *content* (team members, etc.)
never syncs automatically; a member added in dev is simply absent from prod.

**Why this matters / incident:** a full-content `strapi import` with `--force`
run against prod overwrote ALL content types with dev's versions (not just the
intended one) and broke media relations. Lesson: never push content to prod with
a whole-export force import. Push **one content type at a time**, surgically and
idempotently, scoped to that type's table(s) only — no deletes, and don't touch
media rows for entries whose pictures already match prod.

**How to apply:**
- The only write path to prod from here is the deploy BUILD phase (the build
  container shares the deployment's `DATABASE_URL`); the `executeSql` production
  environment is a read-only replica.
- Gate any prod content write behind an explicit opt-in env flag and unset it
  after a successful deploy, so later direct prod-admin edits aren't clobbered on
  the next publish.
- Strapi v5 draft/publish: each entry is two rows sharing a `document_id` — a
  draft (`published_at IS NULL`) and a published row (`published_at IS NOT NULL`);
  the public site reads the published row. Write both.
- Validate any prod-targeted SQL by running it against dev first (where the values
  already match) — it should be a verifiable no-op proving syntax + idempotency.

**Production database recovery:** prod DB supports point-in-time restore from the
Database pane (retention depends on plan); this is separate from code-checkpoint
rollback and is the clean way to undo a bad prod data mutation.

**Uploads** live in a custom object-storage provider (not local disk), so Strapi
exports do NOT bundle image binaries — a force import that runs the asset phase
can delete object-storage-backed images. Avoid asset-phase imports against prod.
