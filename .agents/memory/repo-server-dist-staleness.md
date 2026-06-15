---
name: repo-server dist staleness breaks dev API
description: Why the dev API (and other apps) 500 with "Cannot read properties of undefined (reading 'parse')" when @repo/server source changes
---

In the `app/` monorepo, `@repo/server`'s package.json `exports` map points to `./dist` (the compiled tsc output), and `dist` is gitignored. The app workflows (`API`, `Admin`, `Client`) only run each app's own `dev` — they do NOT run `@repo/server`'s `tsc --watch`. The intended `turbo run dev` design watches every package, but the Replit workflows skip the packages.

**Symptom:** any router that does `okResponse(schemaFromRepoServer)` throws `Cannot read properties of undefined (reading 'parse')` inside hono-openapi's `resolver` (`validator: o.parse`) because the imported schema is `undefined`. In Vite SSR this breaks the whole router graph, so EVERY endpoint 500s — not just the one whose schema is missing. The error stack points at `okResponse`/the first router evaluated, which is misleading; the real cause is a stale/missing export in `dist`.

**Why:** a new service (e.g. home-philosophers) was added to `packages/server/src` and the barrel, but `dist` was never rebuilt, so the new export was absent from the consumed `dist/index.js`. Production is unaffected because the deploy build runs a fresh `pnpm build`.

**How to apply:**
- If dev API 500s with the `.parse` error after server-side changes, rebuild: `pnpm --filter @repo/server build` (one-off), or rely on the `Server build watch` workflow (`pnpm --filter @repo/server dev` = `tsc --watch`) which keeps `dist` fresh.
- Other `@repo/*` packages follow the same dist-export pattern and could go stale the same way; watch/rebuild them if their consumers start failing similarly.
- Do not "fix" this by editing schema files — the schemas are correct; the build output is stale.
