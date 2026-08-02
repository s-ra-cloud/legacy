---
name: Custom domain vs baked VITE_* origins
description: Prod is served at legacy-project.io but several VITE_ env vars bake legacy-philo.replit.app; browser must stay same-origin.
---

The published site is served at the custom domain `legacy-project.io`, but build-time env vars (`VITE_API_URL`, `VITE_APP_URL`) point at `legacy-philo.replit.app`. Any browser code using those absolute origins makes cross-origin requests that the API answers WITHOUT CORS headers → every fetch fails ("Failed to fetch") only in the browser, never via curl.

**Why:** Aug 2026 incident — Team page permanently showed "Failed to load network" in prod; API was healthy; root cause was the baked cross-origin `VITE_API_URL` in `getRestApiOrigin()`.

**How to apply:** Browser code must use `window.location.origin` (or relative URLs); reserve `VITE_API_URL`/`VITE_APP_URL` for SSR only. Known remaining couplings: auth `trustedOrigins` pinned to `VITE_APP_URL`, admin auth redirects using absolute `VITE_APP_URL`, robots.txt sitemap URL, absolute media URL helper. When debugging prod-only fetch failures, always test from the browser's perspective (CORS), not just curl.
