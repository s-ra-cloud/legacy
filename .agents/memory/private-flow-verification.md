---
name: Private-flow component verification
description: Scope and limits of browser checks for shared components behind sign-in
---

When testing shared library and contribution UI without a signed-in session, use an isolated component test with explicit fixtures rather than weakening the private route. Report component-level checks separately from signed-in integration verification.

**Why:** The contribution book selector is shared with the public library, but its actual route requires authentication. A component test can verify styling and link destinations without establishing that the authenticated flow works end to end.

**How to apply:** Keep fixtures and isolated mounts in test code only. Scope selectors to the test mount or visible elements so hidden public-page cards cannot accidentally satisfy contribution assertions. Direct browser imports of Vite-optimized CommonJS packages may expose their API on the default export rather than named exports.
