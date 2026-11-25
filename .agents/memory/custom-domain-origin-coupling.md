---
name: Custom domain vs baked VITE_* origins
description: Prod is served at legacy-project.io but several VITE_ env vars bake legacy-philo.replit.app; browser must stay same-origin.
---

The published site is served at the custom domain `legacy-project.io`, but build-time env vars (`VITE_API_URL`, `VITE_APP_URL`) point at `legacy-philo.replit.app`. Any browser code using those absolute origins makes cross-origin requests that the API answers WITHOUT CORS headers → every fetch fails ("Failed to fetch") only in the browser, never via curl.

**Why:** Aug 2026 incident — Team page permanently showed "Failed to load network" in prod; API was healthy; root cause was the baked cross-origin `VITE_API_URL` in `getRestApiOrigin()`.

**How to apply:** Browser code must use `window.location.origin` (or relative URLs); reserve `VITE_API_URL`/`VITE_APP_URL` for SSR only. Auth must explicitly trust the verified custom domain as well as any legacy configured origin, and only trust the exact preview domain outside production; never disable origin checks or accept arbitrary request hosts. Other couplings to check: admin auth redirects using absolute `VITE_APP_URL`, robots.txt sitemap URL, absolute media URL helper. When debugging prod-only fetch failures, always test from the browser's perspective (CORS), not just curl.

## Legacy book text files
Production book records still point to text uploads on the prior `legacy-philo.replit.app` host. Those URLs return 200 to server requests but omit CORS headers, so browser `fetch()` from `legacy-project.io` is blocked. The current app's own `/strapi/uploads` object-storage route does not contain these older files, so routing them there directly returns 404.

**Why:** book content remains on the previous media host and has not been copied into the current project's object storage.

**How to apply:** Keep text reads same-origin through the API, which fetches only configured media hosts and known upload paths. Do not treat successful `curl` requests as proof that browser fetches are allowed.
