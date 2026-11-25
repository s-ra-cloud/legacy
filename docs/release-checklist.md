# Release safety checklist

## Before publishing

- Confirm the source snapshot includes both frontend Vite configurations.
  Do not ignore `app/apps/admin/vite.config.ts`: it provides the React Router
  plugin, and a working local file can hide its absence from a clean release.
- Run `node --test scripts/test-release-safety.test.mjs` and
  `cd app && pnpm --filter @repo/api test`.
- Build with `bash scripts/build-prod.sh`. The build must exit nonzero if a
  native rebuild, code generation, API build, website build, admin build or
  Strapi build fails.
- Review the current security scan. Passing builds are not a security sign-off.
- Review the managed database schema diff in Publish. In particular, preserve
  all existing user data and the uploaded profile-media relation, and include
  the additive nullable `public.users.auth_image_url` column. Do not replace the
  uploaded-media relation with this URL field.
- Include the additive `gc_verification_entities` and
  `gc_verification_revisions` tables introduced by human verification. Without
  these, the status endpoint fails and the graph cannot safely distinguish
  Verified from Unverified. An empty review history is valid and must return
  an empty successful status list, not a server error. Do not replace production
  data with development data.
- The build and API startup do not migrate the database. Do not reintroduce
  `prisma db push`, `--accept-data-loss`, or startup DDL as a workaround for a
  missing column. Use the managed Publish schema review.
- Automatic account edits and blanket public-role permission grants have been
  removed. Configure public CMS access deliberately; releases must not widen it.

## Explicit content-sync exception

`STRAPI_SYNC_TEAM=1` retains the existing one-shot, targeted team-content sync
in the build. This changes content, not schema. Leave the flag unset for a
normal release. Enable it only for an intentionally reviewed team update,
and unset it after success. A failed sync aborts the build.

## Production API

`@repo/api` builds a Node entrypoint with local TypeScript aliases resolved.
Workspace and third-party packages stay external and are installed from the
workspace lockfile. The production `start` command runs that compiled output,
not Vite or a TypeScript development runner.

The API defaults to `127.0.0.1:3000`, behind nginx. `PORT` remains the public
nginx port; only `API_HOST`/`API_PORT` configure the API listener. Development
continues to use the existing Vite workflow.

Startup performs a read-only `LIMIT 0` query for the required auth-image field.
If schema or connectivity checks fail, it exits before listening and explains
that the Publish schema review is required. It never attempts a migration.

After publishing, verify the public pages, anonymous session endpoint, email
sign-in/session/logout, CMS reads and a same-origin book-text request. Confirm
the API is not serving `/@vite/client` or source-file routes. A 404 is expected.
