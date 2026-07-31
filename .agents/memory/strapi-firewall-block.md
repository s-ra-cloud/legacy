---
name: Strapi npm install blocked by package firewall
description: Replit package firewall blocks @strapi/strapi 5.23.0 (critical CVE); installs fail with 403 even though it's already installed.
---

The Replit package firewall (Socket Security Policy) returns 403 for `@strapi/strapi@5.23.0` tarball downloads due to a critical CVE. `npm install` in `app/apps/strapi` fails whenever npm tries to re-fetch it, even though the package is already present in node_modules.

**Why:** Firewall policy blocks the flagged version at download time; local installs keep working.

**How to apply:** `scripts/post-merge.sh` tolerates the install failure when the installed @strapi/strapi version matches package.json. Any fresh environment (deploy build, task agent repl, node_modules wipe) will hard-fail until Strapi is upgraded to a non-flagged version — prefer upgrading Strapi over fighting the firewall.
