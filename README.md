# LEGACY

**Reconnecting contemporary culture with the texts that shaped it.**

LEGACY is an open-source digital humanities platform for exploring the classical texts (mythical, philosophical and scientific) that formed our collective worldview, often without our noticing. It gives readers and researchers tools for close reading, for mapping how thinkers and their works respond to one another, and for tracing academic lineages. Scholars can also contribute to it directly.

🌐 **Live site:** https://legacy-project.io

> **Status: Alpha.** All three modules are live: NeoAlexandria (the library), The Great Conversation and the Knowledge Tree. Some features are still marked *in preparation*; they are listed under each module.

---

## Table of contents

- [The three modules](#the-three-modules)
  - [NeoAlexandria](#-neoalexandria-vol-i--foundation)
  - [The Great Conversation](#-the-great-conversation-vol-ii--dialogue)
  - [The Knowledge Tree](#-the-knowledge-tree-vol-iii--synthesis)
- [Home page](#home-page)
- [Other pages](#other-pages)
- [Accounts](#accounts)
- [Administration](#administration)
- [Contributing](#contributing)
- [Partners and funding](#partners-and-funding)
- [Data sources and credits](#data-sources-and-credits)
- [Roadmap](#roadmap)
- [Technical overview](#technical-overview)
- [Project structure](#project-structure)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [API](#api)
- [Content model (Strapi)](#content-model-strapi)
- [Deployment](#deployment)
- [Known pitfalls](#known-pitfalls)
- [Contact](#contact)
- [License](#license)

---

## The three modules

### 📚 NeoAlexandria *(Vol. I · Foundation)*
The digital library of classical works, formerly called "The Library". It lives at `/projects/library`.

- **Authors:** a grid of every author in the archive, with their dates. The archive currently holds Ibn Sina, William of Occam, Baruch Spinoza, Immanuel Kant, Søren Kierkegaard, Fritz Mauthner, Bertrand Russell and Ludwig Wittgenstein.
- **Author pages** (`/projects/library/:authorId`) list the author's works in NeoAlexandria, with their publication year.
- **Reader** (`/projects/library/:authorId/:bookId`): the full text of the work in the browser (for example Wittgenstein's *Tractatus Logico-Philosophicus*).
- **Replace text** *(administrators)*: swap a book's text for a corrected HTML or ZIP upload from the book page. Covers, metadata, attribution and Great Conversation links are kept.
- **Source Hunter** *(in preparation)*: an AI model that will search for and retrieve online versions of texts that the partner archives don't provide. It will be modelled on [Legal Data Hunter](https://legaldatahunter.com/). It doesn't search or retrieve anything yet.

### 💬 The Great Conversation *(Vol. II · Dialogue)*
An interactive map of how philosophers and their works connect across three millennia: agreements, oppositions and unresolved dialogues. It lives at `/projects/great-conversation`.

**Two graph views**
- **People:** a *thinkers chronology* that places each person in time, oldest at the bottom, so you can follow who responds to whom across eras.
- **Works:** a network of the texts themselves and the references between them.

**Three data sources**, each labelled in the graph:

| Source | People | Works |
|---|---|---|
| **Archive**: Wittgenstein Archives at the University of Bergen (WAB) / Bergen Nachlass Edition, snapshot of 10 Nov 2026 | Wittgenstein's references to other people | — |
| **AI**: AI-classified connections supplied with the WAB deliverables | — | Connections between works |
| **Scholarly**: references contributed on LEGACY | ✓ | ✓ |

- Each connection has a **stance**: *approval*, *disapproval*, *neutral*, *mixed* or *insufficient evidence*. Dashed lines mark uncertain evidence.
- All archive and AI stances are **AI judgements** until a person reviews them. *Verified* means a person has reviewed the record. It doesn't mean the claim is supported, so check the relation's outcome. *Text confirmed* means the passage was located, not that a scholar reviewed the stance.

**Filters and tools**
- **Verified / Unverified** toggle, plus a *reviewed only* shortcut.
- **Stance** filter, with an option to include uncertain evidence.
- **Authors only:** hides people who never wrote a book or taught a doctrine. Oral teachers such as Socrates count as authors.
- **Minimum connections** threshold (3 by default), and the option to show unconnected entries.
- **Find a node by name**, **Show all** and **Full screen**.
- Navigation: drag to pan, scroll or pinch to zoom, and Tab to step through nodes.
- **Inspector:** select a node or a connection to see its full name, dates and their source, provenance, verification status, change history, and every connection with its stance and evidence (excerpts, archive locators and links).

**Human verification.** Signed-in users can review a person (name and birth date), a work (title and date) or a relation. Reviews are an append-only layer on top of the source data, which is never rewritten. You can follow and amend your own reviews in My Record.

**Merge proposals.** Signed-in contributors can propose that 2–8 records describe the same person or work. They choose which record supplies the name, date and classification, and explain their reasoning. Administrators approve, reject or reverse proposals. A merge only changes how the graph is drawn: the original records stay searchable, and reversing a merge restores them.

### 🌳 The Knowledge Tree *(Vol. III · Synthesis)*
An academic genealogy explorer for documented mentor–student relationships. It lives at `/projects/knowledge-tree`.

- **Start with a NeoAlexandria thinker** (all 8 authors are listed and can be filtered), or **search the Academic Tree by name**. Not every thinker has a documented record.
- **Radial Genealogy:** puts one thinker at the centre and reads their recorded teachers and students outward, generation by generation.
- **Scholarly Constellation:** shows a thinker within the wider network of advisor and student relationships, as a WebGL graph.
- **Researcher profiles:** degrees, research area, homepage and ORCID where the source provides them, plus the documented teachers and students.
- **Connection finder:** finds the shortest documented mentorship path between two researchers, in both directions. A path isn't a measure of intellectual influence, and "no path found" doesn't mean no historical connection exists.
- **Dataset:** a snapshot of The Academic Family Tree from 23 April 2026 ([Zenodo export](https://zenodo.org/records/19739198) by Stephen V. David), with **896,262 researchers**, **1,850,796 documented connections** and **50,771 institutions**. The core genealogy is complete. Publication references are still being imported and grant references haven't been imported yet, so some profiles may be incomplete.
- **Paper mode:** a light reading theme.
- *In preparation:* a **Chronological View** of mentorships across eras, **advanced search**, and **Suggest a Record** / **CSV upload** for cited corrections and additions. These will be reviewed before publication and kept separate from the original Academic Tree data.
- Related project: [**Academic Hunter**](https://github.com/ZachLaik/academic-mentorship-data-hunter), a separate research project that finds additional academic relationships. None of its results are merged into the Knowledge Tree.

## Home page

`/home` brings the platform together:

- **Hero:** philosopher portraits and quotes.
- **Capabilities:** the three modules, with links into each.
- **Philosophy globe:** a rotatable 3D globe with 19 thinkers, from Socrates to Frantz Fanon. Each marker shows the thinker's city, era (Classical Antiquity, Eastern Antiquity, Islamic Golden Age, Medieval, Enlightenment, Modern), school, and a quotation linked to its source.
- **Institutional alliances:** the partner institutions.
- **FAQ:** how to contribute.

## Other pages

| Route | Page |
|---|---|
| `/manifesto` | Vision statement, a video with the scientific director, partners and funding, and the roadmap |
| `/team` | The core team (direction, concept and design, community management, academic advisors, research and development) and the expert network of scholars |
| `/projects/my-record` | A signed-in user's submitted books, Great Conversation references, catalogue requests and verifications, with correction history |
| `/settings` | Profile, email and password settings |
| `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password` | Authentication |
| `/contact-us`, `/privacy-policy` | Contact and privacy policy |
| `/dashboard/...` | Administration (see [Administration](#administration)) |
| `/strapi` | Strapi CMS admin panel (content editing) |

## Accounts

Sign up with an **academic email** and a password. An account lets you:

- submit texts and Great Conversation references (see [Contributing](#contributing));
- verify records and propose merges in The Great Conversation;
- correct your own references and reviews later, with every version kept;
- follow everything in **My Record**, and get in-app **notifications** (bell icon, `Alt+T`).

Your name and institution are shown on your public contributions. Your email address never is.

## Administration

Accounts with the `ADMIN` role get extra tools:

| Route | Tool |
|---|---|
| `/dashboard/users` | Edit and disable user accounts and set their roles |
| `/dashboard/great-conversation` | Editorial review queues: accept or reject contributed connections, correct references, and approve or reject catalogue requests (proposed authors and works) |
| `/dashboard/knowledge-tree` | Load and validate Knowledge Tree snapshot data, and switch the public explorer between data sources |
| `/projects/library/:authorId/:bookId/replace-text` | Replace a NeoAlexandria book's text |
| Great Conversation inspector | Approve, reject or reverse merge proposals |

## Contributing

LEGACY welcomes:

- research ideas on new ways to explore the humanities;
- scholars with expertise in a particular author who want to join the **expert network**;
- contributions that explore how classical texts shape contemporary global identities;
- **new texts** for NeoAlexandria;
- **corrections** to The Great Conversation, through human verification and merge proposals.

**To submit a text to NeoAlexandria:**

1. Download the Word template: [`TemplateLEGACY.dotx`](artifacts/legacy/client/public/assets/TemplateLEGACY.dotx).
2. Format your text with the template, then export it to **HTML**.
3. Sign in and go to `/projects/library/contribute`. Upload the HTML file, or a ZIP archive containing the HTML and its images.
4. Fill in the metadata: author, title, original publication date, translator, and cover image. Files can be up to 15 MB, and ZIP archives up to 60 MB once expanded.

**To add a reference to The Great Conversation:**

1. Sign in, go to `/projects/great-conversation/contribute`, and open the work that contains the reference.
2. Select the passage with the highlighter, or type it if the work has no digital text yet.
3. Say what the passage **explicitly** names: an author, a work, or a specific passage. Record only what the text itself names.
4. Optionally add what it **implicitly** refers to as well, and on what basis: similarity of ideas, biographical evidence, or other.
5. Add the **connection analysis**: stance (agreement, neutral, mixed or opposition), whether the connection itself is uncertain, a comment, and a supporting reference.
6. If the author or work isn't in the catalogue, propose the name. It's saved as an unverified suggestion for editorial review.

Each reference is saved once, even if you retry, and then goes through editorial review. You can correct it later from My Record; the original and every correction stay in its history.

To propose anything else, email **[laura.duparc@um6p.ma](mailto:laura.duparc@um6p.ma)**.

## Partners and funding

**Main research partner:** [Computational Humanities Lab (CHL)](https://www.rpc.ox.ac.uk/research-life/chl/), Regent's Park College, University of Oxford.

**Partner institutions** (since 2025):
- Mohammed VI Polytechnic University (UM6P)
- University of Chicago
- Columbia University (CCCT)
- Aix-Marseille Université

**Funding:** a grant from the Stevanovich Institute on the Formation of Knowledge, and the UM6P Chair of Transitions at the IAS.

## Data sources and credits

| Module | Source | License / notes |
|---|---|---|
| The Great Conversation | Wittgenstein Archives at the University of Bergen (WAB) / Bergen Nachlass Edition | Snapshot of 10 Nov 2026, bundled with the site. Only graph fields, short evidence summaries, identifiers and source URLs are published; the full Nachlass transcriptions are not. Stances are AI-generated unless reviewed |
| Great Conversation dates | Researched author birth dates and work publication years | Sources and uncertainty are documented in [`scripts/great-conversation/`](scripts/great-conversation/) |
| Knowledge Tree | [The Academic Family Tree](https://academictree.org/), [Zenodo export](https://zenodo.org/records/19739198) by Stephen V. David | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); snapshot of 23 Apr 2026. LEGACY is an independent viewer, not an official partner |
| Home globe | Quotations from public-domain editions | Each quotation links to its source |

## Roadmap

| # | Milestone | Description |
|---|---|---|
| **2025** | | |
| 01 | **Landing, Team and Manifesto** | The project's public identity: landing page, contributors and manifesto |
| 02 | **NeoAlexandria: module 1 (alpha)** | Exploring classical texts with search, comparison and annotation tools, integrated with UM6P servers |
| 03 | **Knowledge Tree: module 2 (alpha)** | Visual academic genealogies, ready for public contributions and open-source publication |
| 04 | **The Great Conversation: module 3 (alpha)** | Explicit and implicit connections between texts, with chronological and two-dimensional network views |
| 05 | **Institutional partnerships** | Outreach to universities, archives and laboratories to broaden participation and secure datasets |
| **2026** | | |
| 06 | **Visual overhaul** | Redesign for clarity, speed, coherence and multilingual display |
| 07 | *To be announced* | |

---

## Technical overview

LEGACY is a **TypeScript monorepo** with five services behind **nginx**. The repository is laid out as a Replit workspace: two outer "artifacts" (website and API) wrap the original application, which keeps its own pnpm workspace in `app/`.

```
                        ┌──────────────────────────── nginx (public port) ────────────────────┐
                        │  /           /api, /ws       /admin        /strapi       /storage   │
                        └───┬────────────┬──────────────┬─────────────┬──────────────┬───────┘
                            ▼            ▼              ▼             ▼              ▼
                     Client :5173   API :3000     Admin :3001   Strapi :1337   MinIO / object
                     React Router 7  Hono +        React Router  Strapi 5 CMS   storage
                     (SSR)           OpenAPI       (SSR)         (books, team,  (uploads)
                                       │                         contributions)
                                       ├──► PostgreSQL 16  public:   users, sessions, media,
                                       │                             GC verifications and merges
                                       │                   strapi:   CMS content
                                       │                   knowledge_tree: Academic Tree data
                                       └──► Redis (cache / sessions)
```

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7 (SSR), TanStack Query / Form / Table, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Graphs | D3 (Great Conversation, radial genealogy), Sigma.js 4 + Graphology with ForceAtlas2 (WebGL constellation) |
| API | Hono, hono-openapi, Zod, Scalar API reference; bundled with esbuild for production |
| Auth | better-auth 1.7 (email + password, Google OAuth) |
| Database | PostgreSQL 16, Prisma (schema and migrations), Kysely (type-safe queries) |
| CMS | Strapi 5.60 (in its own `strapi` Postgres schema) |
| Storage | MinIO locally; Google Cloud Storage–backed object storage for Strapi uploads in production |
| Cache | Redis |
| i18n | Paraglide / inlang (English and French) |
| Data pipelines | Python 3.11 (Academic Tree importer, Great Conversation snapshot builders) |
| Tooling | pnpm 10, Turborepo, Biome, ESLint, TypeScript, Node's test runner, jsdom, Vitest |
| Runtime | Node.js 22 |

## Project structure

```
.
├── artifacts/
│   ├── legacy/
│   │   └── client/              # Public website: React Router 7 SSR app, assets, i18n
│   ├── api-server/
│   │   ├── legacy/              # The Hono REST API, served under /api/v1
│   │   └── src/                 # Thin bridge that forwards /api and /ws to the API
│   └── mockup-sandbox/          # Replit design sandbox (not part of the site)
├── app/                         # Original monorepo (its own pnpm workspace and lockfile)
│   ├── apps/
│   │   ├── admin/               # Admin app
│   │   ├── strapi/              # Strapi 5 CMS (installed with npm, not pnpm)
│   │   ├── client -> ../../artifacts/legacy/client       # compatibility symlink
│   │   └── api    -> ../../artifacts/api-server/legacy   # compatibility symlink
│   ├── packages/
│   │   ├── server/              # Business logic, organised into services (users, media, strapi/*…)
│   │   ├── db/                  # Prisma schema and migrations, Kysely client and types
│   │   │   └── knowledge-tree/  # SQL for the knowledge_tree schema
│   │   ├── shared/              # Env validation, Zod helpers, GC verification and merge contracts
│   │   └── ui/                  # Headless components and the generated OpenAPI client
│   └── AGENTS.md                # Architecture conventions
├── scripts/
│   ├── start-dev.sh / build-prod.sh / start-prod.sh / post-merge.sh
│   ├── great-conversation/      # WAB snapshot builders, date research, GC tests
│   ├── knowledge-tree/          # Academic Tree importer, owner-run recovery, KT tests
│   └── library/                 # NeoAlexandria upload and text-replacement tests
├── docs/                        # Release checklist, rollout and recovery notes
├── lib/                         # Replit scaffold packages (not used by the site)
├── nginx.replit.conf            # nginx routes (dev and prod)
├── replit.md                    # Operating notes for the Replit workspace
└── LICENSE
```

The two outer folders (`artifacts/legacy/client` and `artifacts/api-server/legacy`) hold the real source. The symlinks in `app/apps/` let older scripts and paths keep working.

### Architecture conventions

From [`app/AGENTS.md`](app/AGENTS.md):

- **Services** live in `app/packages/server/src/services/<name>/`: `index.ts` exports the actions, `source/` holds one file per DB query or external call, and the optional `module/` and `action/` folders hold reusable and complex logic.
- **API routers** get one file per endpoint group in `artifacts/api-server/legacy/src/router/`, and each calls server services.
- **The client** calls the backend through the typed `$api` client and React Query.

## Running locally

### Prerequisites

- Node.js 22 and pnpm 10 (`corepack enable`)
- PostgreSQL 16, Redis, MinIO and nginx
- Python 3.11 (only for the data pipelines)

The easiest route is **Replit**: open the repo there and press **Run**. The `artifacts/legacy: web` workflow starts every service through [`scripts/start-dev.sh`](scripts/start-dev.sh).

### 1. Install

There are two pnpm workspaces, so install both, plus Strapi:

```bash
git clone https://github.com/s-ra-cloud/legacy.git
cd legacy
pnpm install --frozen-lockfile
cd app && pnpm install --frozen-lockfile
cd apps/strapi && npm install
```

### 2. Configure

```bash
cp app/.env.example app/.env                          # then add the variables below
cp app/apps/strapi/.env.example app/apps/strapi/.env  # replace every "tobemodified"
```

### 3. Database

From `app/`:

```bash
pnpm --filter @repo/db db:migrate
psql "$DATABASE_URL" -c 'CREATE SCHEMA IF NOT EXISTS strapi;'
```

[`scripts/post-merge.sh`](scripts/post-merge.sh) applies the Great Conversation migrations to a **development** database. It refuses to run when `NODE_ENV=production`.

**Knowledge Tree data (optional).** Apply the schema, then import the Academic Family Tree export (see [`scripts/knowledge-tree/README.md`](scripts/knowledge-tree/README.md)):

```bash
psql "$DATABASE_URL" -f app/packages/db/knowledge-tree/schema.sql
python3 scripts/knowledge-tree/import.py --development --files <export-dir> --core-only
python3 scripts/knowledge-tree/import.py --development --files <export-dir>
```

The first pass loads researchers, connections and institutions; the second adds publication and grant references. The importer is resumable and idempotent. Without this data, the Knowledge Tree API returns 503.

### 4. Start

`PORT` sets the public nginx port:

```bash
PORT=5000 bash scripts/start-dev.sh
```

This builds the shared packages, then starts Redis, MinIO, the server-package watcher, API, Admin, Client, Strapi and nginx. If any service exits, the script stops everything.

| Service | URL |
|---|---|
| Website (through nginx) | http://localhost:5000 |
| API reference | http://localhost:5000/api/v1/openapi/reference |
| Strapi admin | http://localhost:5000/strapi/admin |
| MinIO console | http://localhost:9001 |

> `app/docker-compose.yaml` predates the move to `artifacts/` and hasn't been updated for the symlinked layout.

### Tests

From the repo root:

| Command | Covers |
|---|---|
| `pnpm --filter @workspace/scripts test:gc` | Great Conversation graph, filters, chronology, merges and UI interactions |
| `pnpm --filter @workspace/scripts test:library` | NeoAlexandria upload and text replacement |
| `pnpm --filter @workspace/scripts test:kt-relationships` | Knowledge Tree relationship views |
| `node --test scripts/test-release-safety.test.mjs` | Release-safety checks |
| `cd app && pnpm --filter @repo/api test` | API runtime configuration |
| `python3 -m unittest discover -s scripts/great-conversation -p 'test_*.py'` | Great Conversation data builders |

Tests ending in `.integration.mjs` or `-db` need a development database and are never run against production.

## Environment variables

Validated with Zod in [`app/packages/shared/src/env.server.ts`](app/packages/shared/src/env.server.ts) and [`env-client.ts`](app/packages/shared/src/env-client.ts). Put them in `app/.env`.

**Server**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis |
| `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`, `EMAIL_SECURE` | SMTP for transactional email (password reset, OTP) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google sign-in |
| `SESSION_SECRET` | Signs requests between the API and Strapi (text replacement, contributor attribution). Must be set for both processes and never reaches the browser |
| `MINIO_*` | Object storage |
| `API_HOST`, `API_PORT` | API listener (default `127.0.0.1:3000`); `PORT` is the public nginx port |
| `TZ` | Time zone (default `Africa/Casablanca`) |

**Client (build time)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL`, `VITE_APP_URL` | API and site origins (used for SSR only, see [Known pitfalls](#known-pitfalls)) |
| `VITE_STRAPI_URL`, `VITE_STRAPI_FETCH_URL`, `VITE_STRAPI_MEDIA_URL`, `VITE_CMS_API_URL`, `VITE_CMS_IMG_URL` | Strapi endpoints |
| `VITE_STRAPI_CONTRIBUTE_TOKEN` | Strapi token used for contribution uploads. It's visible to the browser, so it can't authorise anything sensitive on its own |

**Strapi** (`app/apps/strapi/.env`): `HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SESSION_SECRET`.

## API

All endpoints are under `/api/v1`. Interactive docs (Scalar) are at **`/api/v1/openapi/reference`**, and the raw spec is at `/api/v1/openapi/spec.json`.

| Route | Description |
|---|---|
| `/users`, `/profile` | User management and the current user's profile |
| `/notifications` | In-app notifications |
| `/media`, `/upload-media` | Media records and uploads |
| `/authors`, `/books` | NeoAlexandria authors and books; `POST /books/:id/text` replaces a book's text (admins) |
| `/requested-books` | Catalogue requests and their editorial review |
| `/gc-contributions`, `/comments` | Great Conversation references, corrections, editorial decisions and comments |
| `/gc-verifications` | Human reviews of people, works and relations, and your own reviews (`/mine`) |
| `/gc-merges` | Merge proposals, previews, decisions and active merges |
| `/home-philosophers` | Philosophers shown in the landing-page hero and globe |
| `/teams`, `/contributors`, `/partners`, `/partnerships` | Team, scholars and institutions |
| `/knowledge-tree/search?q=` | Search researchers by name (20 results max) |
| `/knowledge-tree/stats` | Dataset counts and import progress |
| `/knowledge-tree/researchers/:id` | Researcher profile |
| `/knowledge-tree/network/:id` | Mentors and students around a researcher, generation by generation (depth and size are capped) |
| `/knowledge-tree/path?from=&to=` | Shortest documented mentorship path between two researchers |
| `/knowledge-tree-admin/*` | Knowledge Tree data loading and source switching (admins) |

## Content model (Strapi)

| Content type | Key fields |
|---|---|
| **Author** | first/last name, gender, birth–death, picture, expert, YouTube link → books |
| **Book** | title, subtitle, original publication date, translator, translation date, contributor, submitted files → author, GC contributions |
| **GC Contribution** | source and target book, excerpts, explicit/implicit reference details, stance, uncertainty, comment, supporting reference, contributor name and institution, editorial status, revision history → comments |
| **GC Comment** | comment, contributor name and institution → contribution |
| **Requested book** | book name, author name, requester, review status |
| **Home Philosopher** | name, dates, era, school, image, hero quote and placement, city/country/coordinates for the globe |
| **Team** | name, role, category, affiliation, description, picture |
| **Contributing scholars** | name, role, affiliation, description, picture |
| **Partner institutions** / **Partnership** | name, logo, role, description, display order |

Human verifications (`gc_verification_*`) and merges (`gc_merge_*`) live in the `public` schema, managed by Prisma. They sit on top of the CMS and archive data and never rewrite it.

## Deployment

Production runs on a **Replit autoscale deployment** with server-side rendering, served at **legacy-project.io**.

- **Build:** [`scripts/build-prod.sh`](scripts/build-prod.sh) installs dependencies, builds the shared packages, generates the Prisma client, bundles the API to `dist/node.js`, and builds Admin, Client and Strapi. The build fails if any step fails.
- **Start:** [`scripts/start-prod.sh`](scripts/start-prod.sh) starts Redis, then nginx right away so the health check passes. It seeds uploads to object storage once (guarded by a sentinel), then runs Strapi, API, Admin and Client under restart-on-exit watchdogs.
- **Database:** neither the build nor startup changes the database schema. Schema changes go through Replit's **Publish** schema review. At startup the API checks that the schema it needs exists, and exits with an explanation if it doesn't.
- **Release checklist:** follow [`docs/release-checklist.md`](docs/release-checklist.md) before every publish.
- **Content sync:** Replit migrates the database *schema* to production, not its *rows*. To push Team changes, set `STRAPI_SYNC_TEAM=1` for one deploy, then unset it.

Further notes in [`docs/`](docs/): Great Conversation merges, connection-analysis rollout, library text replacement, the administrator reference editor, the workspace port, Knowledge Tree production recovery, and the security upgrade assessment.

## Known pitfalls

- **Stale `dist/` in shared packages.** `@repo/server` is consumed from its compiled `dist/`. If the dev API returns 500 on every route with `Cannot read properties of undefined (reading 'parse')`, rebuild with `pnpm --filter @repo/server build`.
- **Same-origin requests in the browser.** Production is served at `legacy-project.io`, but `VITE_API_URL`/`VITE_APP_URL` are baked in at build time. Browser code must use relative URLs or `window.location.origin`, or the cross-origin requests fail on CORS.
- **No schema changes in build or startup.** Don't reintroduce `prisma db push`, `--accept-data-loss` or startup DDL. Never choose "overwrite production data" when publishing.
- **Never force-import a full Strapi export into production.** It overwrites every content type and can delete media stored in object storage. Push one content type at a time, idempotently.
- **Optional media fields.** When a Strapi media field is optional, null-guard it in the server transform and mark it nullable in the output schema.
- **Knowledge Tree in production.** Publishing schema doesn't copy rows, and production has no `pg_trgm` extension. Production data is loaded through the owner-run recovery in [`scripts/knowledge-tree/OWNER-RECOVERY.md`](scripts/knowledge-tree/OWNER-RECOVERY.md). See also [`docs/knowledge-tree-production-recovery.md`](docs/knowledge-tree-production-recovery.md).
- **Test the constellation with WebGL on.** Type checks and SSR builds pass even when the Sigma.js render is broken.
- **Keep the provenance distinctions.** When updating the Great Conversation snapshot, rerun the integrity tests. Never relabel AI stances as verified, or invent connections for the sources that have none.

## Contact

For questions, partnerships or to join the expert network, email **[laura.duparc@um6p.ma](mailto:laura.duparc@um6p.ma)**.

## License

LEGACY is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License v3.0**. See [`LICENSE`](LICENSE) for the full text.

Third-party data keeps its own license. In particular, the Academic Family Tree data is under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
