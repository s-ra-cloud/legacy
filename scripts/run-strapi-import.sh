#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../app/apps/strapi"
printf 'y\n' | node_modules/.bin/strapi import \
  --key oo \
  --force \
  -f export_20260518143539.tar.gz.enc
