# Administrator reference template

Modern records are corrected within their saved author/work identity, using the
same specificity rules as contributor amendments. Identity and nested citation
metadata are reconstructed from the locked published record. An analysis save
does not change editorial status, original retry keys/fingerprints, attribution,
linked books, comments, or existing contributor revision history.

Historical records remain explicitly unclassified. They are not converted to
modern specificity and may be corrected even if older analysis is incomplete.

## Development and production schema

The development `strapi.gc_contributions` table was inspected directly. It already
contains `reference_details` and `reference_revision_history` as nullable JSONB;
target work ID/title/quotation, global type and stance are nullable. Submission,
continuation, contributor and editorial fields are also present. No duplicate
columns or new migrations are needed.

The existing partial-reference and reference-amendment additive migrations remain
in development post-merge setup. Before owner-reviewed Publish, review its schema
diff for these existing storage fields and nullable target/type/stance columns.
Do not replace production data, run a broad schema push, or add production
startup/build migrations. This development verification does not verify production.

## Verification

- Focused contract, schema-setup and rendered component regressions cover modern
  author/work/passage/refined references, historical records, forged identity
  fields, invalid evidence, cleared hidden analysis, stale drafts and consecutive
  saves. A background list refresh cannot advance an unsaved draft's version.
- Real development PostgreSQL/Strapi tests sign in through Better Auth with a
  disposable administrator. All five formats survive specificity/analysis
  corrections, read/reload/second-save, original submission retries, and protected
  metadata/history assertions. Anonymous, forged and stale requests are rejected.
- The signed-in browser check used the normal login form and
  `/dashboard/great-conversation`, saved an author-only reference twice, reloaded
  it, changed a refined passage to work-only and verified hidden analysis stayed
  absent after reload. It also inspected explicit-passage, work-only and labelled
  historical forms and a 390px-wide layout.
- That check exposed an existing search failure: Strapi rejects public filters
  on its private contributor-email field. The unsupported filter was removed;
  the editor now accurately offers work-title/passage search. The authenticated
  persistence regression also checks non-empty search results.
- Shared server compilation and Strapi TypeScript checks pass. The full Legacy
  client typecheck has existing errors elsewhere (including generated API types,
  library views and auth routes); it reported no errors in the changed editor.

The persistence test can be run from `app/` with its normal development
environment loaded and `GC_ADMIN_FIXTURE_PATH` pointing at disposable
administrator credentials. It never prints credentials. Browser fixture helpers
create only test-owned references/users and have explicit cleanup commands.
