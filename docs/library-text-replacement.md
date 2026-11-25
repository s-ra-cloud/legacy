# Library text replacement

NeoAlexandria library books are separate from Great Conversation excerpts and
verification reviews. An authenticated user whose existing role is `ADMIN` can
open **Replace text** from any library book page. The guarded replacement route
is the existing book URL followed by `/replace-text`.

The shared contribution pipeline accepts HTML/HTM or ZIP with HTML/images.
Individual files are limited to 15 MB; ZIPs are limited to 1,000 entries and
60 MB expanded. Embedded images stay inline. Selected local images are uploaded
and their paths rewritten using the existing Strapi media service.

After confirmation, `POST /api/v1/books/:id/text` accepts only `mediaId` and
`expectedFileId`. It reuses the existing `ADMIN` role policy. The server calls a
separate signed CMS operation: the browser-visible contribution token alone is
not authorization to replace text. `SESSION_SECRET` must be available to both the
existing API process and Strapi process; it is never sent to the client.

Strapi checks the stored media record and updates only existing text-media
relations inside a transaction. Both draft and published components retain their
identities and covers. The operation does not republish a draft, change
attribution, bibliographic metadata, author, or Great Conversation relationships,
or delete media. A stale `expectedFileId` returns 409 instead of overwriting
another administrator's change. Logs contain actor, book and old/new file IDs,
not book text.

Reader metadata is revalidated on mount. Text requests use a media-version
parameter, a media-specific query key, fetch `no-store`, and HTTP `no-store`.
The existing trusted-media proxy and reader sanitization remain in use.

## Checks

- `pnpm --filter @workspace/scripts test:library` runs isolated API/CMS and real
  form/component interaction checks, including two synthetic ADMIN principals.
  Authentication and storage boundaries are test doubles; no production records
  are used or changed.
- `LIBRARY_TEST_ORIGIN="https://$REPLIT_DEV_DOMAIN" app/node_modules/.bin/dotenv
  -e app/.env -- node scripts/library/cms.integration.mjs` checks real development
  CMS persistence and the public text endpoint with a disposable book/media
  fixture. It refuses non-development domains and removes only its own fixture.

The live fixture check was attempted but blocked before creating anything:
the configured development contribution credential returned 401 on Strapi's
upload endpoint. A fresh signed request with an existing HTML-media reference
and a nonexistent book reached the new CMS operation and correctly returned 404.
The anonymous replacement API returned 401 and the guarded form redirected to
sign-in. No named person's role assignment was inferred, changed, or verified.
Use the existing account administration screens to check each intended account's
role. Restore a valid development contribution credential through the existing
secure configuration before rerunning the live upload/persistence check.
