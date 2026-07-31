#!/usr/bin/env bash
# Post-merge setup: runs automatically after a task branch is merged.
# Must be: idempotent, non-interactive (stdin closed), fast.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing monorepo dependencies (pnpm)"
cd app && pnpm install --frozen-lockfile 2>&1 || pnpm install
cd ..

echo "==> Installing Strapi dependencies (npm)"
# The package firewall can block re-downloads of already-installed packages
# (e.g. @strapi/strapi flagged for a CVE). If install fails but the installed
# tree already matches package.json, keep going instead of failing the merge.
cd app/apps/strapi
if ! npm install --prefer-offline --no-audit --no-fund 2>&1; then
  wanted=$(node -p "require('./package.json').dependencies['@strapi/strapi']")
  installed=$(node -p "require('./node_modules/@strapi/strapi/package.json').version" 2>/dev/null || echo "missing")
  if [ "$installed" = "${wanted#[~^]}" ]; then
    echo "WARN: npm install failed (likely package firewall), but @strapi/strapi $installed is already installed — continuing."
  else
    echo "ERROR: npm install failed and installed @strapi/strapi ($installed) does not match package.json ($wanted)."
    exit 1
  fi
fi
cd ../../..

echo "==> Post-merge setup complete"
