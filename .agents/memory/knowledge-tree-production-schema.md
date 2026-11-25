---
name: Knowledge Tree production schema review
description: Publish omitted the custom namespace but detected additive public tables; preserve production data and separate schema from data recovery.
---

Do not assume an empty publishing schema diff proves that Knowledge Tree is
installed in production. A review returned no changes while direct read-only
catalog inspection found no `knowledge_tree` namespace and the live stats API
returned 503; development held the complete dataset.

**Why:** Blindly recommending another publish would not establish that the
missing custom namespace is represented in the proposed migration. The user
requires controlled recovery preserving all existing production data.

**How to apply:** Recheck both catalogs and the actual proposed statements.
Resolve the namespace omission through supported schema-management surfaces
before importing. Never overwrite production with development data or add
startup/build schema DDL. See the production recovery review in `docs/`.

An additive alternative using uniquely prefixed tables in `public` was detected
by Publish where the custom namespace was not. Prefer testing a small additive
development table and reviewing the real diff before claiming platform support
is the only route. Do not infer universal custom-schema support from this case.

**Why:** The user correctly challenged the premature conclusion that no code-side
workaround existed. A namespace-compatibility probe succeeded without touching
production or copying the large dataset.

**How to apply:** Keep the original dataset and application target intact until
replacement tables are populated and verified. Schema publication and data
loading are separate stages. Check production extension prerequisites explicitly;
the reviewed diff did not install pg_trgm despite including an index requiring it.

The user approved a separate background import worker, not an import inside
website startup or build. Keep the existing website's Autoscale hosting.

**Why:** The reference dataset is too large to tie to a website startup, and
Autoscale may stop idle instances. Recovery must not impair the existing site.

**How to apply:** Use a separately managed worker lifecycle with resumable
data-only loading. Adding it as a shared-database artifact to this legacy project
requires the supported project-structure migration approval first; worker
approval alone is not approval to restructure or publish the existing app.
