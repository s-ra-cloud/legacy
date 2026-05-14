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

echo "==> Build complete"
