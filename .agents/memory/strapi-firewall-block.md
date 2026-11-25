---
name: Strapi npm install blocked by package firewall
description: Historical firewall block on old Strapi; upgrade aligned packages rather than relying on cached installs.
---

The Replit package firewall blocked the historical `@strapi/strapi@5.23.0` tarball due to a critical CVE, even when cached local installs worked. Moving to a patched, aligned Strapi release removed this installation obstacle.

**Why:** Firewall policy blocks the flagged version at download time; local installs keep working.

**How to apply:** Prefer upgrading the aligned Strapi package set over fighting the firewall or trusting cached node_modules. Keep both the workspace pnpm lock and the separate Strapi npm lock synchronized because existing installation paths use both.
