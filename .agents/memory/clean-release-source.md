---
name: Clean release source snapshots
description: Why release verification must use trackable source, not all local files
---

Verify clean releases from the trackable source snapshot, excluding dependencies
and generated output. Do not copy ignored application configuration into a test
merely to make the build pass; first correct its tracking policy.

**Why:** The admin Vite configuration previously existed in the working tree but
was excluded by a broad source-file ignore rule. Local builds succeeded, whereas
a clean source snapshot failed to detect the React Router plugin. Restoring
source trackability, rather than changing dependency versions, was necessary.

**How to apply:** When a clean build differs from a local one, compare the actual
source inputs and check ignore rules before changing packages. Keep generated
config bundles ignored without ignoring the configuration source.
