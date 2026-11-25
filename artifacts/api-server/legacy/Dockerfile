FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN pnpm add -g turbo@^2.5.0
COPY . .
RUN turbo prune @repo/api --docker

FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@repo/api

RUN find . \
  ! -path './node_modules' \
  ! -path '*/node_modules/*' \
  ! -path '*/dist/*' \
  ! -name 'node_modules' \
  ! -name 'dist' \
  ! -name 'package.json' \
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

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
