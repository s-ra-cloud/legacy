#!/usr/bin/env bash
# Post-merge setup: runs automatically after a task branch is merged.
# Must be: idempotent, non-interactive (stdin closed), fast.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing monorepo dependencies (pnpm)"
cd app && pnpm install --frozen-lockfile 2>&1 || pnpm install
cd ..

echo "==> Installing Strapi dependencies (npm)"
cd app/apps/strapi && npm install --prefer-offline 2>&1
cd ../../..

echo "==> Post-merge setup complete"
