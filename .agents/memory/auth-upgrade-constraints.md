---
name: Authentication upgrade constraints
description: Preserve separate uploaded-media profiles, dual Zod versions, and shared SSR query context during dependency upgrades.
---

Keep Better Auth's optional image URL separate from the app's uploaded-media relation. Add only a nullable URL field when required; do not repurpose media IDs or disable runtime schema validation.

**Why:** Older authentication tolerated the missing optional image column; newer runtime validation rejects every authentication request when it is absent. The uploaded-media relation is not an image URL.

**How to apply:** Check initialization AND an origin-bearing signup/login/session/logout journey after auth upgrades. Preserve existing uploaded profile media and custom user fields.

Keep application Zod 3 schemas intact when authentication internally uses Zod 4; a direct aliased Zod 4 dependency can make inferred auth declarations portable without a global schema migration.

**Why:** pnpm's isolated transitive packages can cause TypeScript declaration errors even when runtime versions coexist safely.

**How to apply:** Prefer a named alias over `any` annotations or forcing every existing schema to a new major.

Keep OpenAPI query hooks and TanStack Query providers in the same SSR module context.

**Why:** Mixed externalized and Vite-transformed imports can create separate context instances despite matching package versions and successful builds.

**How to apply:** Verify public query-backed routes at runtime after dependency updates; package deduplication alone may not be sufficient.

After a lockfile change, distinguish cold Vite dependency optimization from persistent browser failures.

**Why:** On separate dependency-update runs, the first preview capture reported invalid React hook calls while dependencies were being optimized; a fresh capture after optimization rendered correctly with no hook errors.

**How to apply:** Inspect optimization logs and confirm one fresh load after the optimizer settles before changing React versions or declaring a regression. Persistent errors still require investigation.
