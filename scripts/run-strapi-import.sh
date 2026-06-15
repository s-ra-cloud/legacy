#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../app/apps/strapi"
# --exclude files: the export is content-only (uploads live in object storage,
# not bundled in the archive). Skipping the asset phase prevents the import from
# deleting the object-storage-backed images during a --force import.
printf 'y\n' | node_modules/.bin/strapi import \
  --key oo \
  --force \
  --exclude files \
  -f export_20260518143539.tar.gz.enc
