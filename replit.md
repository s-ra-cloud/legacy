# Legacy

Legacy is the existing research and philosophy website, including its library,
Great Conversation, Knowledge Tree, contributor tools, and administration.

## Run and operate

- Use the managed `artifacts/legacy: web` workflow for the existing website.
  It starts the original SSR client and admin, Hono API, Strapi, Redis, MinIO,
  and nginx through `scripts/start-dev.sh`.
- `artifacts/api-server: API Server` forwards `/api` and `/ws` to the same
  legacy service group, preserving nginx routing and streaming.
- The root pnpm workspace owns artifact wrappers and the original scaffold.
  `app/` retains its own workspace, catalog, and lockfile. Install both:
  `pnpm install --frozen-lockfile` and `cd app && pnpm install --frozen-lockfile`.
- Post-merge setup performs those installs and rebuilds native dependencies.
- Website production build/run use `scripts/build-prod.sh` and
  `scripts/start-prod.sh`. The website remains **Autoscale**, with dynamic SSR,
  not static SPA hosting. Do not publish automatically.

## Existing app source

- `artifacts/legacy/client/`: original React Router SSR frontend, assets, fonts,
  CSS, API client, authentication pages, and localization.
- `artifacts/api-server/legacy/`: original Hono API.
- `app/apps/admin/`, `app/apps/strapi/`: existing admin and CMS.
- `app/packages/`: existing Kysely/Prisma database, server services, shared code,
  and UI packages. Existing `@repo/*` import contracts are retained.
- `app/apps/client` and `app/apps/api` are compatibility symlinks for existing
  scripts and resource paths. The actual source resides in the artifacts above.
- `nginx.replit.conf`: original public routes including `/strapi`, media,
  `/storage`, `/admin`, and API/WS routes. The runner substitutes only its public
  listening port from the artifact's `PORT`.
- `lib/db`, `lib/api-spec`, and `lib/api-client-react` are pre-existing scaffold
  packages, **not** replacements for the legacy database or API contracts.

## Safety constraints

Preserve frontend branding, authentication, proxy routes, media storage, and
the legacy-project.io deployment identity. Do not reset, reinitialize, overwrite,
or broadly push any database. Do not run scaffold DB push commands against the
existing app, or introduce production DDL in build/startup hooks.

Knowledge Tree recovery and the separate recovery worker are separate work.
The populated original development namespace and six empty public staging
tables must remain untouched. Do not duplicate the dataset to test migration
or describe staging as populated. See
`docs/knowledge-tree-production-recovery.md`.

Local environment files and mutable `.data` storage are private, ignored files;
never commit credentials or print their contents. Existing private App Storage
objects must remain untouched. Authenticated verification must use real
authentication; do not add bypasses.

## Scholarly reference contributions

- New references preserve the explicitly named level separately from an optional
  implicit refinement. Historical references without this metadata remain
  unclassified by specificity; do not backfill guesses.
- All reference levels may carry connection analysis; only passage references
  have a target quotation and implicit-passage basis. Missing
  catalogue identities must remain absent; proposed names are review requests,
  not published author/work records.
- The contribution and its linked proposed names are saved atomically. The same
  submission key must return the same saved reference on retry, not duplicate it.
- Apply the narrow partial-reference development migration through post-merge
  setup. Never migrate production in startup/build scripts or broadly push the
  Strapi schema. Review pending schema changes before publishing.
