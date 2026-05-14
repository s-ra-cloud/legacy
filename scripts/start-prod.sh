#!/usr/bin/env bash
# Production runner for autoscale deployment.
# Starts Redis, MinIO, Strapi, API, Admin, Client behind nginx on $PORT (default 5000).
#
# WARNING: Redis and MinIO data are NOT durable on autoscale — each replica gets
# fresh local disk on cold start. For real workloads, point REDIS_HOST and
# MINIO_HOST/MINIO_PORT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY at managed services
# and remove the matching `&` lines below.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

export NODE_ENV="${NODE_ENV:-production}"
PUBLIC_PORT="${PORT:-5000}"

mkdir -p .data/minio .data/nginx/logs .data/nginx/tmp

# Copy nginx mime.types into a writable location (nix store is read-only).
cp -n "$(dirname "$(dirname "$(readlink -f "$(which nginx)")")")/conf/mime.types" \
  .data/nginx/mime.types 2>/dev/null || true

cleanup() {
  echo "==> Shutting down child processes"
  pkill -P $$ || true
}
trap cleanup EXIT INT TERM

echo "==> Starting Redis on 127.0.0.1:6379"
redis-server --port 6379 --bind 127.0.0.1 --save "" --appendonly no --daemonize yes

echo "==> Starting MinIO on 127.0.0.1:9000"
minio server .data/minio --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 \
  > .data/minio.log 2>&1 &

# Tag each child's output so we can tell them apart in the deployment log.
prefix() { sed -u "s|^|[$1] |"; }

echo "==> Starting Strapi on 127.0.0.1:1337"
( cd "$ROOT/app/apps/strapi" && NODE_ENV=production HOST=127.0.0.1 PORT=1337 \
    npm run start 2>&1 | prefix strapi ) &

echo "==> Starting API on 127.0.0.1:3000"
( cd "$ROOT/app" && pnpm --filter '@repo/api' start 2>&1 | prefix api ) &

echo "==> Starting Admin on 127.0.0.1:3001"
( cd "$ROOT/app/apps/admin" && PORT=3001 HOST=127.0.0.1 NODE_ENV=production \
    pnpm exec react-router-serve ./build/server/index.js 2>&1 | prefix admin ) &

echo "==> Starting Client on 127.0.0.1:5173"
( cd "$ROOT/app/apps/client" && PORT=5173 HOST=127.0.0.1 NODE_ENV=production \
    pnpm exec react-router-serve ./build/server/index.js 2>&1 | prefix client ) &

# Start nginx immediately so the deployment health probe on $PORT succeeds.
# Upstreams will fill in over the next few seconds; nginx returns 502 until then,
# which is fine — the platform only needs port $PORT bound to pass the probe.
sed -e "s/listen 0\.0\.0\.0:5000/listen 0.0.0.0:${PUBLIC_PORT}/" \
    -e "s|include       \.data/nginx/mime.types;|include       ${ROOT}/.data/nginx/mime.types;|" \
    -e "s|include \.data/nginx/mime.types;|include ${ROOT}/.data/nginx/mime.types;|" \
    "$ROOT/nginx.replit.conf" > "$ROOT/.data/nginx/nginx.prod.conf"

echo "==> Starting nginx on 0.0.0.0:${PUBLIC_PORT}"
exec nginx -c "$ROOT/.data/nginx/nginx.prod.conf" -p "$ROOT" \
  -e "$ROOT/.data/nginx/logs/error.log"
