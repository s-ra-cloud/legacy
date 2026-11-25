#!/usr/bin/env bash
# Post-merge setup: runs automatically after a task branch is merged.
# Must be: idempotent, non-interactive (stdin closed), fast.
set -euo pipefail

if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "Post-merge setup is development-only; production schema changes belong to Publish." >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Installing workspace and legacy dependencies (pnpm)"
pnpm install --frozen-lockfile
cd app && pnpm install --frozen-lockfile
cd ..

echo "==> Rebuilding approved native dependencies"
cd app
pnpm rebuild prisma @prisma/engines @swc/core esbuild sharp

echo "==> Applying additive human-verification schema to the development database"
# Do not push/reset the whole legacy schema. Publish introspects this development
# schema to propose the corresponding production additions for owner review.
pnpm --filter @repo/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file prisma/migrations/20261111000000_gc_human_verification/migration.sql
pnpm --filter @repo/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file prisma/migrations/20261112000000_gc_verification_amendments/migration.sql
pnpm --filter @repo/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file prisma/migrations/20261119000000_gc_partial_references/migration.sql
pnpm --filter @repo/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file prisma/migrations/20261120000000_gc_reference_amendments/migration.sql
pnpm --filter @repo/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file prisma/migrations/20261123000000_contributor_attribution/migration.sql
pnpm --filter @repo/db exec prisma db execute \
  --schema prisma/schema.prisma \
  --file prisma/migrations/20261124000000_gc_connection_analysis/migration.sql
cd ..

echo "==> Post-merge setup complete"
