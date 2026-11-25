FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.9.0 --activate

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN pnpm add -g turbo@^2.5.0
COPY . .
RUN turbo prune @repo/client --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Public Environment Variables
RUN echo 'VITE_API_URL="{{VITE_API_URL}}"' >> .env
RUN echo 'VITE_APP_URL="{{VITE_APP_URL}}"' >> .env
RUN echo 'VITE_APP_CLIENT_URL="{{VITE_APP_CLIENT_URL}}"' >> .env

# Install dependencies
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@repo/client

RUN find . \
  ! -path './node_modules' \
  ! -path '*/node_modules/*' \
  ! -path '*/dist/*' \
  ! -name 'node_modules' \
  ! -name 'dist' \
  ! -name 'build' \
  ! -name 'package.json' \
  ! -name 'entrypoint.sh' \
  | awk -F/ 'NF == 4' \
  | xargs rm -rf

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono
USER hono

COPY --from=installer --chown=hono:nodejs /app .

RUN chmod +x apps/client/entrypoint.sh

EXPOSE 5001

CMD ["pnpm", "-C", "apps/client/", "start"]
ENTRYPOINT ["/app/apps/client/entrypoint.sh"]
