#!/usr/bin/env bash
# Production runner for autoscale deployment.
# Starts Redis, MinIO, Strapi, API, Admin, Client behind nginx on $PORT (default 5000).
set -euo pipefail

cd "$(dirname "$0")/.."
export ROOT="$PWD"

export NODE_ENV="${NODE_ENV:-production}"
PUBLIC_PORT="${PORT:-5000}"

# Load app-level .env so all child services see MINIO_*, REDIS_*, etc.
# Existing env vars (Replit Secrets, deployment-injected) take precedence.
if [ -f "$ROOT/app/.env" ]; then
  set -a
  while IFS='=' read -r key val; do
    case "$key" in ''|\#*) continue ;; esac
    if [ -z "${!key:-}" ]; then
      val="${val%\"}"; val="${val#\"}"
      val="${val%\'}"; val="${val#\'}"
      export "$key=$val"
    fi
  done < "$ROOT/app/.env"
  set +a
fi

# Point MinIO-aware services at the in-container MinIO unless explicitly overridden.
export MINIO_HOST="${MINIO_HOST:-127.0.0.1}"
export MINIO_PORT="${MINIO_PORT:-9000}"
export MINIO_USE_SSL="${MINIO_USE_SSL:-false}"
export MINIO_BUCKET_NAME="${MINIO_BUCKET_NAME:-uploads}"
export MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-${MINIO_ROOT_USER:-}}"
export MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-}}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"

mkdir -p .data/minio .data/nginx/logs .data/nginx/tmp

# Copy nginx mime.types into a writable location (nix store is read-only).
cp -n "$(dirname "$(dirname "$(readlink -f "$(which nginx)")")")/conf/mime.types" \
  .data/nginx/mime.types 2>/dev/null || true

# Free any ports left over from a previous container run.
for port in 3000 3001 5173 1337 9000; do
  fuser -k "${port}/tcp" 2>/dev/null || true
done

cleanup() {
  echo "==> Shutting down child processes"
  kill -- -$$ 2>/dev/null || pkill -P $$ || true
}
trap cleanup EXIT INT TERM

# Tag each child's output so we can tell them apart in the deployment log.
prefix() { sed -u "s|^|[$1] |"; }

# Watchdog: run a command in a loop, restarting on exit.
# Usage: watchdog <label> <delay_seconds> <command...>
watchdog() {
  local label="$1" delay="$2"
  shift 2
  while true; do
    "$@" 2>&1 | prefix "$label" || true
    echo "[$label] process exited — restarting in ${delay}s..."
    sleep "$delay"
  done
}

echo "==> Starting Redis on 127.0.0.1:6379"
redis-server --port 6379 --bind 127.0.0.1 --save "" --appendonly no --daemonize yes

echo "==> Starting MinIO on 127.0.0.1:9000"
minio server .data/minio --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 \
  > .data/minio.log 2>&1 &

# Start nginx RIGHT NOW so the deployment health probe on $PORT passes immediately.
# Services (Strapi, API, etc.) aren't up yet so nginx will 502 briefly — that's fine.
sed -e "s/listen 0\.0\.0\.0:5000/listen 0.0.0.0:${PUBLIC_PORT}/" \
    -e "s|include       \.data/nginx/mime.types;|include       ${ROOT}/.data/nginx/mime.types;|" \
    -e "s|include \.data/nginx/mime.types;|include ${ROOT}/.data/nginx/mime.types;|" \
    "$ROOT/nginx.replit.conf" > "$ROOT/.data/nginx/nginx.prod.conf"

echo "==> Starting nginx on 0.0.0.0:${PUBLIC_PORT}"
nginx -c "$ROOT/.data/nginx/nginx.prod.conf" -p "$ROOT" \
  -e "$ROOT/.data/nginx/logs/error.log"

# Seed the DB if it's empty — runs synchronously so Strapi starts with data already there.
# Checks five content tables so a single empty table doesn't trigger a spurious re-import.
echo "==> Checking if Strapi data needs seeding..."
CONTENT_COUNT=$(psql "$DATABASE_URL" -t -c "
  SELECT (SELECT count(*) FROM strapi.authors)
       + (SELECT count(*) FROM strapi.books)
       + (SELECT count(*) FROM strapi.teams)
       + (SELECT count(*) FROM strapi.partners)
       + (SELECT count(*) FROM strapi.files)
" 2>/dev/null | tr -d ' \n' || echo "0")
if [ "${CONTENT_COUNT:-0}" = "0" ] 2>/dev/null; then
  echo "==> Production DB is empty — running Strapi import..."
  EXPORT_FILE="$ROOT/app/apps/strapi/export_20260518143539.tar.gz.enc"
  if [ -f "$EXPORT_FILE" ]; then
    (cd "$ROOT/app/apps/strapi" && yes | npm run strapi import -- -f "$EXPORT_FILE" --key oo --force --only content,config 2>&1) | prefix "strapi-seed"
    echo "==> Fixing locale on imported records..."
    psql "$DATABASE_URL" -c "
      UPDATE strapi.authors SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.books SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.teams SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.partners SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.partnerships SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.gc_contributions SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.contributors SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.files SET locale='en' WHERE locale IS NULL OR locale='';
      UPDATE strapi.upload_folders SET locale='en' WHERE locale IS NULL OR locale='';
    " 2>&1 | prefix "strapi-seed"
    echo "==> Seeding complete."
  else
    echo "==> Export file not found at $EXPORT_FILE — skipping seed."
  fi
else
  echo "==> Strapi data already present (${CONTENT_COUNT} records) — skipping seed."
fi

echo "==> Starting Strapi on 127.0.0.1:1337 (watchdog)"
# Strapi crashes when the DB drops a connection. Watchdog restarts it automatically.
# The fetcher layer retries for up to ~32 s so API calls survive brief Strapi downtime.
(
  watchdog strapi 5 \
    bash -c 'cd "$ROOT/app/apps/strapi" && NODE_ENV=production HOST=127.0.0.1 PORT=1337 npm run start'
) &

echo "==> Starting API on 127.0.0.1:3000 (watchdog)"
( watchdog api 5 bash -c 'cd "$ROOT/app" && pnpm --filter "@repo/api" start' ) &

echo "==> Starting Admin on 127.0.0.1:3001 (watchdog)"
( watchdog admin 5 bash -c 'cd "$ROOT/app/apps/admin" && PORT=3001 HOST=127.0.0.1 NODE_ENV=production pnpm exec react-router-serve ./build/server/index.js' ) &

echo "==> Starting Client on 127.0.0.1:5173 (watchdog)"
( watchdog client 5 bash -c 'cd "$ROOT/app/apps/client" && PORT=5173 HOST=127.0.0.1 NODE_ENV=production pnpm exec react-router-serve ./build/server/index.js' ) &

# Keep the script alive so all background watchdogs keep running.
wait
