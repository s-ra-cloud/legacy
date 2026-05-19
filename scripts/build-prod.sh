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

# ---------------------------------------------------------------------------
# One-time Strapi content import (triggered by STRAPI_IMPORT_ON_START=1)
# ---------------------------------------------------------------------------
# Runs during the BUILD phase so it is not subject to the startup health-check
# timeout. The build container has full database access. Remove or unset the
# secret after a successful deploy to stop re-importing on future deploys.
if [ "${STRAPI_IMPORT_ON_START:-}" = "1" ]; then
  EXPORT_FILE="$ROOT/app/apps/strapi/export_20260518143539.tar.gz.enc"
  if [ ! -f "$EXPORT_FILE" ]; then
    echo "[FATAL] Strapi import file not found: $EXPORT_FILE"
    exit 1
  fi
  echo "==> Running Strapi content import (this may take a few minutes)…"
  # set +e so pipefail does not fire on the strapi CLI's non-zero exit;
  # we capture the real exit code via PIPESTATUS and fail explicitly.
  set +e
  (
    NODE_ENV=production \
    node_modules/.bin/strapi import \
      --key oo \
      --force \
      -f "$EXPORT_FILE" \
      < /dev/null
  ) 2>&1
  _import_exit=$?
  set -e
  if [ "$_import_exit" -ne 0 ]; then
    echo "[FATAL] Strapi import failed (exit code: $_import_exit)"
    exit 1
  fi
  echo "==> Strapi import complete"
fi
cd "$ROOT"

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
