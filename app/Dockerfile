FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update -y && \
    apt-get install -y openssl curl unzip && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g corepack@latest
RUN corepack prepare pnpm@10.11.0 --activate

# Install bun for potential use
RUN curl -fsSL https://bun.sh/install | bash
RUN mv /root/.bun/bin/bun /usr/local/bin/

# Stage 1: Dependencies
FROM base AS deps

WORKDIR /app

# Copy package files first (lightweight layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy workspace packages (needed for pnpm workspace resolution)
COPY packages ./packages
COPY apps ./apps
COPY tooling ./tooling

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @repo/db exec prisma generate

RUN pnpm build

# Stage 2: Production
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/tooling ./tooling
COPY --from=deps /app/package.json ./
COPY --from=deps /app/pnpm-lock.yaml ./
COPY --from=deps /app/pnpm-workspace.yaml ./
COPY --from=deps /app/turbo.json ./
COPY --from=deps /app/.env ./

COPY --from=deps /app/packages/db/prisma ./packages/db/prisma
COPY --from=deps /app/packages/db/dist ./packages/db/dist

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000 5000 5001 1337

# ENV NODE_ENV=production

ENTRYPOINT ["./entrypoint.sh"]