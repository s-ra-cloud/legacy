#!/usr/bin/env bash
# Preserve the existing service topology; only the public nginx port changes.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"
export NODE_ENV=development
PUBLIC_PORT="${PORT:?The artifact workflow must supply PORT}"
pids=()
cleanup() {
  trap - EXIT INT TERM
  for pid in "${pids[@]}"; do kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true; done
  wait || true
}
trap cleanup EXIT INT TERM
start() {
  setsid bash -c "$2" &
  pids+=("$!")
}
export ROOT

# dotenv-cli preserves injected variables. Never print or source credentials.
cd "$ROOT/app"
pnpm --filter @repo/shared --filter @repo/db --filter @repo/server build
cd "$ROOT"

mkdir -p .data/nginx/logs .data/nginx/tmp .data/minio
# Runtime state is ignored and absent in a clean checkout. Provision nginx's
# standard MIME map from the installed package, never from an old runtime folder.
if [ ! -f "$ROOT/.data/nginx/mime.types" ]; then
  NGINX_ROOT="$(dirname "$(dirname "$(readlink -f "$(command -v nginx)")")")"
  cp "$NGINX_ROOT/conf/mime.types" "$ROOT/.data/nginx/mime.types"
fi
if ! redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; then
  start redis 'exec redis-server --port 6379 --bind 127.0.0.1 --save "" --appendonly no'
fi
start minio 'exec minio server --quiet "$ROOT/.data/minio" --address 127.0.0.1:9000 --console-address 127.0.0.1:9001'
start shared 'cd "$ROOT/app"; exec pnpm --filter @repo/server dev'
start api 'cd "$ROOT/app"; exec pnpm --filter @repo/api dev'
start admin 'cd "$ROOT/app"; exec pnpm --filter admin dev'
start client 'cd "$ROOT/app"; exec pnpm --filter @repo/client dev'
start strapi 'cd "$ROOT/app/apps/strapi"; unset PORT; exec npm run develop'

sed -e "s/listen 0\.0\.0\.0:5000/listen 0.0.0.0:${PUBLIC_PORT}/" \
    -e "s|include       \.data/nginx/mime.types;|include       ${ROOT}/.data/nginx/mime.types;|" \
    "$ROOT/nginx.replit.conf" > "$ROOT/.data/nginx/nginx.dev.conf"
start nginx 'exec nginx -c "$ROOT/.data/nginx/nginx.dev.conf" -p "$ROOT" -e "$ROOT/.data/nginx/logs/error.log"'
# Fail explicitly if any owned service exits, rather than leaving a partial app.
wait -n "${pids[@]}"
exit 1
