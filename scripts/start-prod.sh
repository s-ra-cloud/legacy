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

PUBLIC_PORT="${PORT:-5000}"

mkdir -p .data/minio .data/nginx/logs .data/nginx/tmp

# Copy nginx mime.types into a writable location (nix store is read-only).
cp -n "$(dirname "$(dirname "$(readlink -f "$(which nginx)")")")/conf/mime.types" \
  .data/nginx/mime.types 2>/dev/null || true

# Reap children when nginx exits.
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

echo "==> Starting Strapi on 127.0.0.1:1337"
( cd "$ROOT/app/apps/strapi" && HOST=127.0.0.1 PORT=1337 npm run start ) &

echo "==> Starting API on 127.0.0.1:3000"
( cd "$ROOT/app" && pnpm --filter '@repo/api' start ) &

echo "==> Starting Admin on 127.0.0.1:3001"
( cd "$ROOT/app/apps/admin" && PORT=3001 HOST=127.0.0.1 \
    node ../../node_modules/.bin/react-router-serve ./build/server/index.js ) &

echo "==> Starting Client on 127.0.0.1:5173"
( cd "$ROOT/app/apps/client" && PORT=5173 HOST=127.0.0.1 \
    node ../../node_modules/.bin/react-router-serve ./build/server/index.js ) &

# Wait for upstreams to come online before nginx accepts traffic.
echo "==> Waiting for upstreams"
for hp in 127.0.0.1:3000 127.0.0.1:3001 127.0.0.1:5173 127.0.0.1:1337 127.0.0.1:9000; do
  for i in $(seq 1 60); do
    if (echo > "/dev/tcp/${hp%:*}/${hp##*:}") 2>/dev/null; then
      echo "  $hp ready"
      break
    fi
    sleep 1
  done
done

# Render nginx config with the deployment's $PORT in place of 5000.
sed "s/listen 0\.0\.0\.0:5000/listen 0.0.0.0:${PUBLIC_PORT}/" \
  "$ROOT/nginx.replit.conf" > "$ROOT/.data/nginx/nginx.prod.conf"

echo "==> Starting nginx on 0.0.0.0:${PUBLIC_PORT}"
exec nginx -c "$ROOT/.data/nginx/nginx.prod.conf" -p "$ROOT" \
  -e "$ROOT/.data/nginx/logs/error.log"
