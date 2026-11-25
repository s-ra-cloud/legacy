# Legacy workspace port verification

This is a structure-preserving port, not the Knowledge Tree recovery or its worker.
No publication, database push/reset, data-copy import, or private-object mutation
was performed.

## Runtime adaptation

The web artifact serves the existing dynamic React Router SSR website, not the
scaffold SPA. Its managed workflow starts the original internal services behind
nginx. The API artifact contains the original Hono backend and a small outer
path-routing bridge so `/api` and `/ws` reach that same service group. Request
paths, cookies, bodies, responses, and streaming remain intact.

The nested legacy workspace retains its existing dependency versions. Only the
client/API importer locations and workspace links changed in its lockfile.
Compatibility symlinks retain the existing scripts' paths. Node 22 is within
Strapi's existing supported engine range. The website remains Autoscale.

## Checks performed

- Compared original client, API, admin, and shared-package source inventories:
  no missing files; changes limited to package launch paths and Vite configuration.
  All client UI, fonts, styles, and assets were copied without redesign.
- Managed web and API workflows started. Shared legacy packages compiled cleanly.
  Strapi started against its existing PostgreSQL schema; existing CMS seed
  guards reported non-empty content and skipped seeding.
- Public homepage, library, Knowledge Tree, team, manifesto, sign-in, admin
  entry, and Strapi admin returned successful responses.
- Strapi health returned 204. Public CMS data requests succeeded.
- Existing Knowledge Tree stats returned the original development counts:
  896,262 researchers, 1,850,796 connections, 50,771 institutions,
  103,020,372 publication references, and 6,954,331 grant references.
  These are development counts, **not production recovery**.
- Anonymous session requests succeeded, and the private contribution route
  redirected to sign-in. No auth bypass was introduced.
- Browser captures checked the existing homepage opening sequence and library.
  A first cold-optimization capture had a React hook error; the subsequent
  settled load rendered. Existing animated-home hydration warnings were not
  refactored as part of this port.
- Existing release-safety tests and API runtime configuration tests passed.
  The API bridge test checks request/response preservation and explicit 503
  behavior when the legacy service is unavailable.
- A clean nginx runtime-directory check confirmed development startup provisions
  the MIME map from the installed nginx package without relying on ignored files.
  Only generated nginx state was moved aside; MinIO storage was preserved.

## Verification limits

Signed-in contribution/editing flows and private admin operations were not
verified with an authenticated session. Public rendering, anonymous protection,
and unchanged source do not establish end-to-end signed-in verification.
Google OAuth was not completed. Production was neither changed nor republished.
The large Knowledge Tree dataset and six empty public staging tables remain
outside this port's migration/cutover scope; consult the recovery review.
