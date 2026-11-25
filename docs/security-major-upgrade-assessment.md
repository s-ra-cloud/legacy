# Major security upgrade assessment

Assessment date: 2026-10-28. Scope: UUID, webpack-dev-middleware, Nodemailer,
Vite and Zod. This is an assessment, **not a remediation or a security sign-off**.
No application code, dependency manifests, lockfiles, database, stored objects,
workflow settings or deployment settings were changed.

## Decision summary and order

Priority reflects reachable behavior and regression cost, not just advisory severity.

| Order | Finding | Exposure in this repository | Decision |
| --- | --- | --- | --- |
| 1 | Zod resource exhaustion, high | Zod 3 validates API inputs and CMS responses; Strapi also uses vulnerable Zod 4.4.3. Collection parsing can consume excessive memory. | Plan request-size/cardinality containment first; patch Strapi's Zod 4 paths separately; migrate app schemas only with the compatibility plan below. |
| 2 | Vite file disclosure/editor/middleware advisories, up to high | Public development preview; importantly, **production API also starts Vite**. Client/admin production SSR uses built output instead. | Upgrade the three direct Vite 5 dependencies together to 6.4.5 as the smallest evidenced compatible candidate. Separately replace the production API's dev-server runner. |
| 3 | Nodemailer parsing, injection and transport advisories, up to high | Notification emails use SMTP at runtime; a queued mail worker is also instantiated. Some vulnerable options are not used, but recipient parsing remains relevant. | Upgrade direct server Nodemailer 7.0.13 to 10.2.1 with mail contract tests. Treat Strapi's separately pinned 10.0.9 as a second path. |
| 4 | UUID buffer bounds, moderate in audits | Storage/auth HTTP libraries run in production; localization, code generation and developer tools add other copies. Inspected callers use v4/v7 without caller-supplied output buffers. | No demonstrated trigger in inspected consumers. Prefer parent upgrades/removal of UUID usage, not a transitive major override. Storage upgrade needs a Node 22 plan. |
| 5 | webpack-dev-middleware traversal, high | Installed through Strapi but only selected for its optional webpack development bundler; configured commands use default Vite. Strapi webpack defaults also terminate publicPath with `/`. | Keep webpack inactive, retain trailing-slash publicPath, await a compatible Strapi parent fix or test an isolated upstream integration. Do not downgrade Strapi or force middleware 8 globally. |

Execute small, separate changes. Priorities 1–3 need attention before spending
time removing unreachable optional/build-only copies. None is fixed by this report.

## Evidence and limits

Read the authentication upgrade constraints before inspecting consumers. Evidence:

- `app/pnpm-lock.yaml`, `app/pnpm-workspace.yaml`, workspace manifests and
  `app/apps/strapi/package-lock.json`.
- Fresh, read-only `pnpm audit --json` in `app`: 0 critical, 37 high, 72 moderate,
  14 low across the whole workspace. These totals include unrelated packages.
- Fresh, read-only `npm audit --json` in `app/apps/strapi`: 0 critical, 27 high,
  15 moderate, 2 low. **Do not add these totals**: the graphs overlap.
- `pnpm -r why uuid webpack-dev-middleware nodemailer vite zod --depth 6`,
  installed consumer source, and public npm registry version/dependency/engine
  metadata. Audit findings sometimes report one representative path, not every
  importer; the consumer inventory below supplements those paths.
- Current runtime: Node 20.20.0, pnpm 10.11.0. Repository engine declarations
  still permit Node 18 in places; candidate Node 20+ changes must reconcile them.

No install, `audit fix`, exploit, email delivery, authenticated action, database
query, content import, upload or production request was performed. Registry
compatibility means declared engine/peer compatibility, **not a tested upgrade**.
The regression checks below are acceptance criteria for subsequent implementation;
they were not executed as proof of hypothetical upgrades.

### Separate locks and existing installation ambiguity

Strapi is both a pnpm workspace package and the subject of a separate npm lock.
Its root entry resolves to the pnpm Strapi 5.60.0 package, but there are also old
local node_modules remnants: direct resolution from the Strapi application finds
Vite 5.4.19, middleware 6.1.2, Zod 3.25.67 and `@strapi/utils` 5.23.0.
These are **not proof that Strapi 5.60.0 internally loads those versions**:
resolution must be checked from each actual importing module.
`npm ls --all` reports invalid/extraneous dependencies in this mixed installation,
so its noisy tree is not an authoritative clean-install graph.

Assessments above use both committed locks and inspect actual consumers.
Before implementing upgrades, establish clean isolated install baselines for both
supported installation paths, using frozen pnpm installation and npm CI in a
disposable copy. Do not delete the working installation as part of an assessment.
Synchronize both locks for future Strapi changes; verify module resolution from
the actual Strapi parent after installation. A cached successful startup alone
does not establish reproducibility.

## 1. Zod: runtime risk, two different upgrade scopes

Advisory: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
audit range `<4.6.6`; current latest checked is 4.6.7.

**Inventory**

- Workspace catalog `zod: ^3.25.76`, resolved 3.25.76, spans API, server, DB,
  shared, UI, client and admin. `@scalar/hono-api-reference@0.8.x` also pulls
  Zod 3.24.1 through Scalar types.
- Strapi 5.60.0 packages pin Zod **4.4.3**; its koa-body/koa-session paths also
  retain Zod 3 (the npm lock includes 3.25.67). Fixing one branch is not enough.
- Better Auth 1.7.14 already uses Zod **4.6.7**; server's named `zod-v4` alias
  points to `npm:zod@^4.6.7`. Preserve the alias for portable inferred declarations.

**Reachability**

`app/apps/api/src/app.ts` routes public CMS/book reads and authentication, plus
protected write routes. `@hono/zod-validator`, custom form parsing, shared filters,
DB-derived schemas and CMS output transforms all participate at runtime.
`packages/shared/src/zod-filter.ts` converts input into arrays;
`packages/server/src/services/media/schemas/input.ts` validates upload arrays with
a minimum but no count maximum. Rich content schemas contain nested collections.
Some flows are authenticated; CMS output parsing also handles stored content.
Presence alone does not prove an unauthenticated exploit for every schema.

No explicit Hono global body limit was found in `app.ts`; nginx permits 1024 MB
generally and 5 GB under `/storage/`. Strapi uses its default body middleware.
Those are not evidence of safe per-endpoint parsing limits. Zod 3 array validation
can traverse elements even when a `.max()` constraint fails: do not assume adding
`.max()` alone prevents expensive parsing.

**Scoped compatibility plan**

1. Inventory untrusted JSON, multipart and query collection boundaries. Add
   route-appropriate byte limits before parsing and cardinality/depth checks
   before per-element validation. Bound returned validation errors. Keep upload
   streaming and legitimate media/book sizes working; do not blanket-limit all
   requests to a tiny body size. This is containment, not an advisory closure.
2. For Strapi Zod 4 consumers, first seek an aligned Strapi release with >=4.6.6.
   Latest checked 5.60.0 still pins 4.4.3. A parent-scoped **4-to-4** exception
   could be evaluated in a separate change if no parent fix exists, testing every
   pinned consumer and both locks; it must not rewrite Zod 3 branches.
3. For app Zod 3, create schema fixtures before migrating: coercion, defaults,
   optional/null, enum, date, refinement, transformations, inferred types and
   error response shapes. Keep v3 and v4 schemas at explicit boundaries; don't
   pass a v4 schema into a v3-only OpenAPI extension.
4. Coordinate OpenAPI/form adapters. Current `zod-openapi@4.2.4` relies on
   `zod-openapi/extend` and `.openapi()` metadata throughout shared schemas.
   `hono-openapi@0.4.6` and `@hono/zod-validator@0.4.3` are coupled consumers.
   Registry candidates: `zod-openapi@5.4.5` declares Zod 3.25.74 or 4 and Node
   >=20, but its API still needs migration; latest 6.0.2 requires Node >=22.14
   and Zod 4. `hono-openapi@1.5.0` uses Standard Schema validation and requires
   Hono ^4.11.2; `@hono/zod-validator@0.9.1` accepts Zod 3/4 and Hono >=4.11.2.
   These are migration candidates, not drop-in fixes. Existing hook-form
   resolvers 5.9.2 accept the current Zod 3 peer; verify v4 form errors explicitly.
5. Scalar latest 0.12.14 changes its dependency chain and requires Node >=22.
   Evaluate the API-reference UI separately; don't upgrade the whole runtime
   just to remove a docs-only nested copy.
6. Switch one bounded schema/service slice at a time, regenerate OpenAPI/types
   and verify UI callers, then move remaining catalog users. Keep auth's
   uploaded profile media and nullable auth image URL separate throughout.

## 2. Vite: not exclusively a build tool here

Direct API/admin/client Vite resolves to **5.4.21**. Strapi 5.60.0 and the root
Vitest path use **6.4.5**, so not every Vite instance is vulnerable.

Runtime evidence:

- `apps/api/package.json`: both `start` and `dev` execute `vite`.
- `scripts/start-prod.sh`: invokes `pnpm --filter "@repo/api" start`.
- `apps/api/vite.config.ts`: Hono adapter, host `0.0.0.0`, port 3000.
- `nginx.replit.conf`: proxies `/api/` and `/strapi/uploads/` to that API process.
  Exact malicious URL reachability differs through nginx vs a direct port;
  don't infer that every Vite endpoint is public, or that the API is build-only.
- Client preview uses `0.0.0.0`, `allowedHosts: true`; admin uses loopback with
  `allowedHosts: true` behind nginx. Preview access is an exposure boundary.
- Production client/admin use `react-router-serve` on built server bundles.

Audit advisories: GHSA-4w7w-66w2-5vf9 (source-map traversal),
GHSA-rq7h-c2jc-7f22 (filesystem allow-list), GHSA-9jrq-w75r-8gcw
(custom middleware cross-origin execution), GHSA-r825-w8mm-5pxw
(editor CLI interpretation), plus Windows-specific GHSA-v6wh-96g9-6wx3,
GHSA-698v-4r3x-3vcv, GHSA-587h-7wmj-h5pm and GHSA-fx2h-pf6j-xcff.
Windows-only prerequisites don't apply to this Linux container; this does not
eliminate the cross-platform findings. The combined reported Vite 6 fix floor is
6.4.4; **6.4.5** is the concrete candidate already present elsewhere in the graph.

`@react-router/dev@7.18.5` peers accept Vite 5/6/7/8 and Node >=20;
`@tailwindcss/vite@4.3.3` accepts Vite 6; `vite-tsconfig-paths@5.1.4` accepts Vite;
Paraglide 2's current plugin must be exercised rather than upgraded incidentally.
The Hono adapter 0.19.1 has no restrictive Vite peer, but this is not proof of
runtime compatibility. First test Vite 6.4.5 with current parents; don't introduce
React Router 8 (latest 8.5.1 needs Node >=22.22) or Vite 8 as collateral changes.

Follow separately with a production Hono Node-server entrypoint using the existing
`@hono/node-server` dependency. Current `src/index.ts` exports `app` but does not
start a Node listener (the serve code is commented out). Do not just change
`start` to `node dist/index.js`: that would leave no listening server, and emitted
workspace aliases/exports also need checking.

## 3. Nodemailer: runtime recipient parsing vs unused options

`packages/server` declares ^7.0.2 and resolves **7.0.13**.
`src/lib/mailer.ts` creates an SMTP transporter using environment configuration
and a BullMQ worker. It explicitly maps only from/to/subject/html from queued
data. No external envelope, raw content, attachment paths, list-header options,
custom transport name, JSON transport, OAuth token retrieval or DKIM configuration
was found at either send site.

`src/services/notifications/index.ts` actively sends emails to selected users'
stored addresses. `sendAuthEmail` exists but has no caller found in app source;
do not claim email verification/reset delivery is enabled. The worker's existence
alone also doesn't prove queue jobs are currently being produced.

The absent options reduce exposure to raw/file-read/SSRF and option injection
advisories. Recipient address parsing remains used; stored addresses pass through
shared `z.string().email()` validation on some paths, but don't assume all legacy
or externally supplied addresses are safe. SMTP reply parsing also runs: exploit
conditions include a hostile/compromised SMTP peer or an insecure hop. Whether
TLS is enabled is configuration-dependent; no secret values were inspected.

Do not stop at Nodemailer 8: newer advisories require >=9.0.1, >=10.0.13 and
>=10.1.4. Current registry candidate **10.2.1** requires Node >=20, compatible
with the current runtime but not the repository's broad Node >=18 declarations.
`@types/nodemailer` is currently ^6.4.17; latest checked is 8.0.2. Test the
transporter/sendMail typing against the new runtime instead of blindly matching
major numbers or suppressing errors.

Strapi's separate chain is
`@strapi/strapi@5.60.0 -> @strapi/email -> @strapi/provider-email-sendmail ->
nodemailer@10.0.9`. The provider pins exactly 10.0.9 even in latest 5.60.0.
No custom email provider was configured in `config/plugins.ts`; default sendmail
uses a different transport from the app's SMTP. SMTP-only advisories are not
automatically reachable there, while address parsing can be. Prefer an aligned
Strapi provider release; if unavailable, evaluate a tested provider-specific
upgrade/replacement, never globally force every Nodemailer copy.

### Nodemailer advisory coverage

The audit reported these IDs; each is accessible at
`https://github.com/advisories/<ID>`. Include all when re-auditing, not just the
oldest injection report:

- Options/content paths: GHSA-c7w3-x93f-qmm8, GHSA-vvjj-xcjg-gr5g,
  GHSA-268h-hp4c-crq3, GHSA-wqvq-jvpq-h66f, GHSA-p6gq-j5cr-w38f,
  GHSA-8m3c-c648-2xjj, GHSA-r7g4-qg5f-qqm2, GHSA-39m8-27wv-hr27.
- Address parsing/domain interpretation: GHSA-wmmp-3585-3rmp,
  GHSA-2x7j-588g-ccc2, GHSA-cc9r-2j5m-2m83, GHSA-8vvx-rff5-p5rq,
  GHSA-v53p-9fqp-m79j, GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w,
  GHSA-85x2-q946-cp5h, GHSA-g73g-hqqh-jr95.
- SMTP transport: GHSA-6vj9-mwq6-2f5v, GHSA-4ffr-jq9g-5ffx,
  GHSA-4g23-2xm8-66gc.

## 4. UUID: follow the functions and parents

[GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
affects UUID <11.1.1. Its trigger is **v3/v5/v6 functions with an output buffer
and invalid offset/size**, not ordinary v4 generation. This is partial-write
integrity risk, not evidence of arbitrary native memory corruption.

| Parent / resolved UUID | Consumer evidence | Parent route |
| --- | --- | --- |
| API and Strapi `@google-cloud/storage@7.22.0`, gaxios 6.7.1 -> 9.0.1; teeny-request 9 -> 9.x | Installed gaxios and teeny-request use `v4()` for multipart boundaries, without output buffers. Runtime media access is critical, but this advisory's trigger was not found there. | Latest storage 8.4.0 requires Node >=22 and uses newer gaxios/teeny/auth parents. Earlier storage 8.0–8.2 still retain some old parents, so a major bump alone isn't sufficient. |
| Direct API `google-auth-library@9.15.1` -> gaxios -> 9.0.1 | Same HTTP helper v4 call; external-account sidecar auth is used by uploads router. | 10.5.0 declares Node >=18 and gaxios ^7 without UUID; latest 11.3.1 needs Node >=22. A direct auth bump does not remove storage's independently nested v9 auth. |
| Paraglide 2.0.12 -> inlang SDK 2.4.8 / lix SDK 0.4.7 -> 10.0.0 | Build/localization tooling; inspected helpers use v4 and DB initialization uses v7. | Update all three pinned Paraglide declarations together to candidate 2.29.2, which uses inlang SDK ^4.0.4 (UUID 14). Check project-format/generated messages before accepting. |
| react-router-devtools 1.1.10 -> react-d3-tree 3.6.6 -> 8.3.2 | Development dependency; tree IDs use v4 without buffers. | react-d3-tree 3.6.7 has no UUID dependency and satisfies the parent's ^3.6.6 range. Prefer that compatible refresh; latest devtools 6.2.3 is not needed for this fix. |
| prisma-kysely 1.8.0 -> Prisma internals 5.3.1 -> checkpoint-client -> 9.0.0 | DB code generation/build path, not a demonstrated app request path; affected buffer API use not established. | Latest prisma-kysely 3.2.1 requires Prisma >=7 and changes generator dependencies. Defer to a separate Prisma/generator compatibility change, not a UUID override. |

No application UUID imports were found; application record IDs primarily use
CUID2. The `strapi.uuid` manifest value is project metadata, **not a dependency**.
UUID 12+ removes CommonJS support; forcing a latest UUID into CommonJS parents
could break storage or tooling despite eliminating audit entries.

## 5. webpack-dev-middleware: optional branch, no compatible parent fix yet

[GHSA-g84c-rxfj-3j2c](https://github.com/advisories/GHSA-g84c-rxfj-3j2c):
Strapi 5.60.0 pins **6.1.3**. The registry latest Strapi is already installed,
so no newer compatible parent fix was identified.

Strapi's installed `dist/src/cli/commands/{build,develop}.js` defaults to Vite;
`dist/src/node/develop.js` selects webpack watch only for `bundler === "webpack"`.
Repository scripts pass no webpack option, and admin customization is
`src/admin/vite.config.ts`. Production uses `strapi start`, not webpack watch.
Webpack's own default output/devMiddleware publicPath is built with a trailing `/`
in `dist/src/node/webpack/config.js`. No app webpack override was found.

There is conflicting advisory metadata: pnpm's machine-readable patched range
says >=7.4.6, npm's affected range says <7.4.5, while the advisory prose says
**8.3.0+ with no 7.x backport**. Use the stricter 8.3.0 floor until upstream
clarifies; 7.4.x must not be described as a proven closure. Latest middleware
8.5.0 needs Node >=20.9 and webpack ^5.101.0, which current runtime and Strapi's
webpack 5.109.2 satisfy. Those two checks do **not** prove Strapi middleware
integration compatibility: it wraps Express-style callbacks for Koa, waits for
valid builds and depends on filesystem/cleanup behavior.

`npm audit` proposes Strapi **4.26.2** as a fix, and a separate Zod suggestion
proposes users-permissions **5.19.0**. These are backwards version suggestions,
not validated safe upgrades. Reject both: downgrading the aligned Strapi set risks
schema/content/media behavior and can reintroduce previously fixed vulnerabilities.

## Regression gates for implementation

All state-changing fixtures belong in disposable test data/staging, never in the
live database or bucket. Do not disable auth or runtime schema validation to make
checks pass. Compare against a recorded baseline and distinguish pre-existing
failures from upgrade regressions.

| Change | Required evidence before acceptance |
| --- | --- |
| Zod containment/migration | Small valid payloads preserve outputs; bounded invalid arrays/maps/nesting/query lists produce 4xx without per-element issue explosions; verify low-memory/time bounds using small safe fixtures, not an OOM attack. Optional/null CMS media, coercions/defaults, enum filters, multipart validation and error shapes remain correct. OpenAPI generation and inferred request/response callers agree. |
| Vite 6 | API health/routes listen at the same port; origin-bearing auth requests work through nginx; client/admin HMR, Tailwind, localization and SSR production builds work. Query-backed public routes render with one React/TanStack context, retaining current `ssr.noExternal`, dedupe and Radix exclusions. Wait for cold dependency optimization, then verify one fresh load; persistent invalid-hook errors are failures. |
| Production API runner | Real Node listener, same `/api/v1`, `/uploads`, auth cookies, redirects, proxy forwarding and error handling; built imports resolve without Vite; no development transform/editor endpoints. Preserve streaming and book content MIME/cache behavior. |
| Nodemailer | Stub/mock transport captures exactly intended recipients/from/subject/html for notification and queued worker paths; rejected/timeout sends fail explicitly and queue semantics don't silently lose mail. Test Unicode/display names, malformed/CRLF/nested recipients and controlled SMTP failures without contacting real recipients. No raw/options passthrough. Typecheck new runtime/types pairing. |
| UUID parents / Node | Multipart boundaries remain valid; external-account token exchange and object reads work with a stubbed sidecar/isolated storage fixture. Same media keys and URLs before/after. Localization output/locales unchanged, devtools render, Prisma generation stays compatible if touched. No unexpected nested vulnerable copies or CommonJS require failures. |
| Strapi parents/scoped patch | Both installation paths reproducible; admin boots/builds; existing content types/permissions/media relation shapes unchanged. Default Vite remains selected. If webpack is deliberately supported, test valid/invalid compilation, HMR, filesystem, shutdown and benign traversal rejection with slash-terminated publicPath; otherwise keep it inactive. |
| Every runtime-affecting change | Auth initialization plus signup/login/session/logout with an allowed Origin; reject an unrelated Origin. Use an existing-role fixture so signup does not create the first privileged user. Preserve role/status/custom fields, linked uploaded profile media, and separate auth image URL. Google OAuth requires configured staging integration; phone login must still fail explicitly while SMS is unconfigured. |
| CMS/media/book access | Anonymous homepage, Team/partners and library metadata remain available. Existing CMS records with no image still render. Fetch an existing `/strapi/uploads/<key>` image and book file; verify bytes/checksum/content-type/cache headers. `/api/v1/books/:id/content` and both library/Great Conversation viewers still load text; missing text remains 404 and disallowed-origin/redirect sources remain blocked. |

### Safe command sequence in a later implementation

From `app`, use targeted package builds/typechecks, not deployment scripts:

```sh
pnpm --filter @repo/shared --filter @repo/db --filter @repo/server build
pnpm --filter @repo/api build
pnpm --filter admin typecheck
pnpm --filter @repo/client typecheck
pnpm --filter admin build
pnpm --filter @repo/client build
# Separately, after matching the Strapi install path under test:
cd apps/strapi && npm run build
```

These commands are future checks, not a claim of successful execution today.
Run focused contract tests for the table above; no repository-owned automated
test suite covering these journeys was found during this assessment.
Then restart only affected services once and inspect logs plus fresh public pages.
Use staged credentials for authenticated UI checks; a signed-out screenshot
cannot validate a signed-in profile or CMS admin screen.

**Do not run `scripts/build-prod.sh` or `scripts/start-prod.sh` as a test.** The
former pushes the Prisma schema with `--accept-data-loss`, syncs content/permissions;
the latter includes a database update and object-store seeding. Neither is
read-only. Do not run migrations, CMS imports, media seeding or publishing for this
assessment or merely to validate dependencies.

Re-run both audits after each coherent upgrade and compare specific advisory
paths, not just totals. Revert the dependency change if behavior regresses; do
not repair an upgrade by deleting CMS data, repurposing uploaded-media IDs,
bypassing validation, broadening trusted origins or changing book-source allowlists.

## Reproducing the read-only assessment

```sh
cd app
pnpm audit --json
pnpm -r why uuid webpack-dev-middleware nodemailer vite zod --depth 6
cd apps/strapi
npm audit --json
```

Audits intentionally return nonzero when findings remain. Inspect both locks for
resolved versions; query `https://registry.npmjs.org/<package>/<version>` for
published engines/dependencies/peers. Registry tags and advisory records are
time-sensitive: recheck them before implementing, especially the conflicting
webpack patched ranges and newly published Nodemailer parsing fixes.

### Assessment verification performed

Verified that this report references every advisory returned for the five scoped
packages (31 distinct IDs), that all five assessments and regression gates are
present, and that the listed admin/client typecheck scripts exist. Whitespace
validation passed. Only this documentation was added.

A baseline preview capture was attempted, but port 5000 refused the connection;
no rendered UI was verified. Services were not started or restarted merely for
this documentation-only assessment, to avoid incidental database/CMS startup
writes. Runtime regression gates remain required when upgrades are implemented.
