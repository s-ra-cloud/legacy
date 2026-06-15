#!/usr/bin/env bash
# Production build for autoscale deployment.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

echo "==> Installing dependencies"
cd "$ROOT/app"
pnpm install --frozen-lockfile --prefer-offline

echo "==> Approving native build scripts"
pnpm rebuild prisma @prisma/engines @swc/core esbuild sharp || true

echo "==> Building shared workspace packages"
pnpm --filter "@repo/shared" --filter "@repo/db" --filter "@repo/server" build

echo "==> Generating Prisma client"
pnpm --filter "@repo/db" exec prisma generate

echo "==> Pushing Prisma schema (idempotent)"
pnpm --filter "@repo/db" exec prisma db push --skip-generate --accept-data-loss || true

echo "==> Ensuring strapi schema exists"
if [ -n "${DATABASE_URL:-}" ]; then
  echo 'CREATE SCHEMA IF NOT EXISTS strapi;' | \
    pnpm --filter "@repo/db" exec prisma db execute --stdin --url "$DATABASE_URL" || true
fi

echo "==> Building admin"
pnpm --filter admin build

echo "==> Building client"
pnpm --filter "@repo/client" build

echo "==> Building Strapi"
cd "$ROOT/app/apps/strapi"
npm run build

cd "$ROOT"

# ---------------------------------------------------------------------------
# Strapi content import (opt-in via STRAPI_IMPORT_ON_START=1)
# ---------------------------------------------------------------------------
# Production Strapi *content* (team members, etc.) is NOT synced by Replit's
# publish flow, which migrates schema only, not row data. The committed
# encrypted export is the source of truth for prod content and is applied here,
# in the BUILD phase, so it: (a) is not subject to the startup health-check
# timeout, and (b) runs exactly once per deploy (no autoscale multi-container
# race). The build container shares the deployment's DATABASE_URL, so this
# writes to the live production database. The import is content-only and
# asset-safe (run-strapi-import.sh uses --exclude files), so it never touches
# the object-storage-backed media. Unset STRAPI_IMPORT_ON_START after a
# successful deploy to stop re-importing (and to allow direct prod-admin edits).
if [ "${STRAPI_IMPORT_ON_START:-}" = "1" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "[FATAL] STRAPI_IMPORT_ON_START=1 but DATABASE_URL is unset — refusing to import."
    exit 1
  fi
  # Log a credential-stripped fingerprint so operators can confirm the target DB.
  echo "==> Importing Strapi content into DB: $(printf '%s' "$DATABASE_URL" | sed -E 's#://[^@/]*@#://***:***@#')"
  if ! NODE_ENV=production bash "$ROOT/scripts/run-strapi-import.sh"; then
    echo "[FATAL] Strapi content import failed — aborting deploy."
    exit 1
  fi
  echo "==> Strapi content import complete"
else
  echo "==> STRAPI_IMPORT_ON_START not set — skipping Strapi content import"
fi

echo "==> Ensuring Strapi Public role has all API permissions"
# The SQL seed can create duplicate roles. This ensures the lowest-id Public role
# (which Strapi actually uses for unauthenticated requests) has all API permissions.
psql "$DATABASE_URL" -c "
  DO \$\$
  DECLARE pub_role_id INT;
  BEGIN
    SELECT id INTO pub_role_id FROM strapi.up_roles WHERE type = 'public' ORDER BY id LIMIT 1;
    INSERT INTO strapi.up_permissions_role_lnk (permission_id, role_id, permission_ord)
    SELECT p.id, pub_role_id, 1
    FROM strapi.up_permissions p
    WHERE p.action LIKE 'api::%'
    AND NOT EXISTS (
      SELECT 1 FROM strapi.up_permissions_role_lnk l
      WHERE l.permission_id = p.id AND l.role_id = pub_role_id
    );
  END \$\$;
" || true

echo "==> Build complete"
