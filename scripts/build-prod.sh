#!/usr/bin/env bash
# Production build for autoscale deployment.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "==> Installing dependencies"
pnpm install --frozen-lockfile --prefer-offline
cd "$ROOT/app"
pnpm install --frozen-lockfile --prefer-offline

echo "==> Approving native build scripts"
pnpm rebuild prisma @prisma/engines @swc/core esbuild sharp

echo "==> Building shared workspace packages"
pnpm --filter "@repo/shared" --filter "@repo/db" --filter "@repo/server" build

echo "==> Generating Prisma client"
pnpm --filter "@repo/db" exec prisma generate

echo "==> Database schema changes are handled by Publish, not this build"

echo "==> Building production API"
pnpm --filter "@repo/api" build

echo "==> Building admin"
pnpm --filter admin build

echo "==> Building client"
pnpm --filter "@repo/client" build

echo "==> Building Strapi"
cd "$ROOT/app/apps/strapi"
npm run build

cd "$ROOT"

# ---------------------------------------------------------------------------
# Strapi Team content sync (opt-in via STRAPI_SYNC_TEAM=1)
# ---------------------------------------------------------------------------
# Replit's publish flow migrates schema only, not Strapi row data, so Team
# changes made in dev do not reach production automatically. This applies ONLY
# the Team content type (scripts/sync-team-prod.sql) to the live production DB,
# in the BUILD phase so it runs exactly once per deploy. The SQL is surgical and
# idempotent: it touches strapi.teams ONLY (updates two descriptions, adds one
# new member), performs no deletes, and never touches media or any other content
# type. Unset STRAPI_SYNC_TEAM after a successful deploy so later direct
# prod-admin edits to the Team are not overwritten on the next publish.
if [ "${STRAPI_SYNC_TEAM:-}" = "1" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[FATAL] STRAPI_SYNC_TEAM=1 but DATABASE_URL is unset — refusing to sync."
    exit 1
  fi
  echo "==> Running explicitly enabled Strapi Team content sync"
  if ! psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/sync-team-prod.sql"; then
    echo "[FATAL] Strapi Team sync failed — aborting deploy."
    exit 1
  fi
  echo "==> Strapi Team sync complete"
else
  echo "==> STRAPI_SYNC_TEAM not set — skipping Strapi Team sync"
fi

echo "==> Build complete"
