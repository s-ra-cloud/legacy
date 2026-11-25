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
- **Source Hunter** *(in preparation)*: an AI model that will search for and retrieve online versions of texts that the partner archives don't provide. It will be modelled on [Legal Data Hunter](https://legaldatahunter.com/). It doesn't search or retrieve anything yet.

### 💬 The Great Conversation *(Vol. II · Dialogue)*
An interactive map of how philosophers and their works connect across three millennia: agreements, oppositions and unresolved dialogues. It lives at `/projects/great-conversation`.

**Two graph views**
- **People:** a *thinkers chronology* that places each person in time, oldest at the bottom, so you can follow who responds to whom across eras.
- **Works:** a network of the texts themselves and the references between them.

**Data and provenance**
- The current data comes from the **Wittgenstein Archives at the University of Bergen (WAB) / Bergen Nachlass Edition** (snapshot of 10 Nov 2026), plus community contributions. At the time of writing, the graph holds 341 people and 386 works.
- Each connection has a **stance**: *approval*, *disapproval*, *neutral*, *mixed* or *insufficient evidence*. Dashed lines mark uncertain evidence.
- Stances are **AI judgements** unless a human review is shown. *Verified* means a person has reviewed the record. It doesn't mean the claim is supported, so check the relation's outcome. *Text confirmed* means the passage was located, not that a scholar reviewed the stance.

**Filters and tools**
- **Verified / Unverified** toggle, plus a *reviewed only* shortcut.
- **Stance** filter, with an option to include uncertain evidence.
- **Authors only:** hides people who never wrote a book or taught a doctrine. Oral teachers such as Socrates count as authors.
- **Minimum connections** threshold, and the option to show unconnected entries.
- **Find a node by name**, **Show all** and **Full screen**.
- Navigation: drag to pan, scroll or pinch to zoom, and Tab to step through nodes.
- **Inspector:** select a node or a connection to see its full name, dates and their source, provenance (AI or archive), verification status, change history and every connection with its stance. Signed-in users can **verify** information.
- **Merge proposals:** anyone can propose that two records describe the same person. Proposals and their history are public. The original source records are never changed, and an administrator can reverse an applied merge.

### 🌳 The Knowledge Tree *(Vol. III · Synthesis)*
An academic genealogy explorer for documented mentor–student relationships. It lives at `/projects/knowledge-tree`.

- **Start with a NeoAlexandria thinker** (all 8 authors are listed and can be filtered), or **search the Academic Tree by name**. Not every thinker has a documented record.
- **Radial Genealogy:** puts one thinker at the centre and reads their recorded teachers and students outward, generation by generation.
- **Scholarly Constellation:** shows a thinker within the wider network of advisor and student relationships.
- **Dataset:** a snapshot of The Academic Family Tree from 23 April 2026, with **896,262 researchers**, **1,850,796 documented connections** and **50,771 institutions**. The core genealogy is complete. Publication references are still being imported and grant references haven't been imported yet, so some profiles may be incomplete.
- **Paper mode:** a light reading theme.
- *In preparation:* a **Chronological View** of mentorships across eras, and **Suggest a Record** / **CSV upload** for cited corrections and additions. These will be reviewed before publication and kept separate from the original Academic Tree data.
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
| `/projects/my-record` | A signed-in user's own submitted books and Great Conversation contributions |
| `/settings` | Profile, email and password settings |
| `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password` | Authentication |
| `/contact-us`, `/privacy-policy` | Contact and privacy policy |
| `/admin` | Internal admin dashboard (user management) |
| `/strapi` | Strapi CMS admin panel (content editing) |

## Accounts

Sign up with an **academic email** and a password. An account lets you:

- verify records in The Great Conversation;
- submit texts and references (see [Contributing](#contributing));
- follow your contributions in **My Record** and get in-app **notifications** (bell icon, `Alt+T`).

## Contributing

LEGACY welcomes:

- research ideas on new ways to explore the humanities;
- scholars with expertise in a particular author who want to join the **expert network**;
- contributions that explore how classical texts shape contemporary global identities;
- **new texts** for NeoAlexandria;
- **corrections** to The Great Conversation, through verification and merge proposals.

**To submit a text to NeoAlexandria:**

1. Download the Word template: [`TemplateLEGACY.dotx`](app/apps/client/public/assets/TemplateLEGACY.dotx).
2. Format your text with the template, then export it to **HTML**.
3. Sign in and go to `/projects/library/contribute`. Upload the HTML file, or a ZIP archive containing the HTML and its images.
4. Fill in the metadata: author, title, original publication date, translator, and cover image.

**To add a reference to The Great Conversation:** sign in, go to `/projects/great-conversation/contribute`, pick an author and a book, highlight the passage, and record the referenced work, whether the reference is explicit or implicit, and its stance (agreement, neutrality or opposition).

To propose anything else, use the [Contact page](https://legacy-project.io/contact-us).

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
| The Great Conversation | Wittgenstein Archives at the University of Bergen (WAB) / Bergen Nachlass Edition | Snapshot of 10 Nov 2026; stance classifications are AI-generated unless reviewed |
| Knowledge Tree | [The Academic Family Tree](https://academictree.org/) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); snapshot of 23 Apr 2026 |
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

> The sections below describe the code in this repository. Some live-site features described above, such as the Academic Tree import, the Bergen archive data and merge proposals, may come from code that hasn't been pushed here yet.

LEGACY is a **TypeScript monorepo** (pnpm workspaces + Turborepo) with five services behind **nginx**:

```
                        ┌──────────────────────────── nginx :5000 ───────────────────────────┐
                        │  /           /api, /ws       /admin        /strapi       /storage   │
                        └───┬────────────┬──────────────┬─────────────┬──────────────┬───────┘
                            ▼            ▼              ▼             ▼              ▼
                     Client :5173   API :3000     Admin :3001   Strapi :1337   MinIO / object
                     React Router 7  Hono +        React Router  Strapi 5 CMS   storage
                     (SSR)           OpenAPI       (SSR)         (books, team,  (uploads)
                                       │                         contributions)
                                       ├──► PostgreSQL 16 (users, sessions, media; Strapi in `strapi` schema)
                                       └──► Redis (cache / sessions)
```

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router v7 (SSR), TanStack Query / Form / Table, Tailwind CSS v4, shadcn/ui, Framer Motion, D3 |
| API | Hono, hono-openapi, Zod, Scalar API reference |
| Auth | better-auth (email + password, Google OAuth) |
| Database | PostgreSQL 16, Prisma (schema and migrations), Kysely (type-safe queries) |
| CMS | Strapi 5 (in its own `strapi` Postgres schema) |
| Storage | MinIO locally, with a custom object-storage provider for Strapi uploads in production |
| Cache | Redis |
| i18n | Paraglide / inlang (English and French) |
| Tooling | Turborepo, pnpm 10, Biome, ESLint, TypeScript 5.8 |

## Project structure

```
.
├── app/                         # The monorepo
│   ├── apps/
│   │   ├── client/              # Public website (React Router 7, SSR)
│   │   ├── admin/               # Internal admin dashboard
│   │   ├── api/                 # Hono REST API, served under /api/v1
│   │   └── strapi/              # Strapi 5 CMS (installed with npm, not pnpm)
│   ├── packages/
│   │   ├── server/              # Business logic, organised into services (users, media, strapi/*…)
│   │   ├── db/                  # Prisma schema and migrations, Kysely client and generated types
│   │   ├── shared/              # Env validation, Zod helpers, HTTP errors, media URL helpers
│   │   └── ui/                  # Headless components and the generated OpenAPI client
│   ├── tooling/typescript/      # Shared tsconfig presets
│   ├── docker-compose.yaml      # Postgres + Redis + app + nginx
│   ├── nginx.conf / nginx.dev.conf
│   └── AGENTS.md                # Architecture conventions
├── scripts/                     # Production build/start, post-merge, Strapi seed and sync SQL
├── nginx.replit.conf            # nginx config used on Replit (dev and prod)
├── .replit / replit.nix         # Replit workflows and system packages
└── docker/                      # Postgres multi-database init script
```

### Architecture conventions

From [`app/AGENTS.md`](app/AGENTS.md):

- **Services** live in `packages/server/src/services/<name>/`: `index.ts` exports the actions, `source/` holds one file per DB query or external call, and the optional `module/` and `action/` folders hold reusable and complex logic.
- **API routers** get one file per endpoint group in `apps/api/src/router/`, and each calls server services.
- **The client** calls the backend through the typed `$api` client and React Query.

## Running locally

### Prerequisites

- Node.js ≥ 18 (20 recommended)
- pnpm 10.11 (`corepack enable`)
- PostgreSQL 16, Redis and MinIO, either installed locally or via Docker
- nginx (optional; it serves everything on a single port)

### 1. Install

```bash
git clone https://github.com/s-ra-cloud/legacy.git
cd legacy/app
pnpm install
cd apps/strapi && npm install && cd ../..
```

> The encrypted Strapi export (`app/apps/strapi/export_*.tar.gz.enc`) is stored with **Git LFS**. Install [git-lfs](https://git-lfs.com) before cloning, or clone with `GIT_LFS_SKIP_SMUDGE=1` if you don't need it.

### 2. Configure

```bash
cp .env.example .env                           # then fill in the variables below
cp apps/strapi/.env.example apps/strapi/.env   # replace every "tobemodified"
```

### 3. Database

```bash
pnpm --filter @repo/db db:migrate     # apply Prisma migrations
psql "$DATABASE_URL" -c 'CREATE SCHEMA IF NOT EXISTS strapi;'
```

### 4. Build the shared packages once

The apps import `@repo/server`, `@repo/shared` and `@repo/db` from their compiled `dist/` folders:

```bash
pnpm --filter @repo/shared --filter @repo/db --filter @repo/server build
```

### 5. Start everything

```bash
pnpm dev                          # turbo: client, admin, api and package watchers
cd apps/strapi && npm run develop # Strapi, in a second terminal
pnpm serve                        # optional: nginx on a single port
```

| Service | URL |
|---|---|
| Client | http://localhost:5173 |
| Admin | http://localhost:3001 |
| API | http://localhost:3000/api |
| API reference | http://localhost:3000/api/v1/openapi/reference |
| Strapi | http://localhost:1337/admin |
| MinIO console | http://localhost:9001 |

**On Replit**, the **Run** button starts every workflow defined in [`.replit`](.replit): Redis, MinIO, nginx, API, Admin, Client, Strapi and the server build watcher.

**With Docker:** `cd app && docker compose up --build` starts Postgres, Redis, the app and nginx on http://localhost:8080.

### Useful scripts (from `app/`)

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` | Run or build every app and package |
| `pnpm lint` / `pnpm biome:check` | Lint |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm --filter @repo/db db:studio` | Open Prisma Studio |
| `pnpm api:typegen` | Regenerate the typed API client from the OpenAPI spec |
| `pnpm lang` | Compile translations |

## Environment variables

Validated with Zod in [`packages/shared/src/env.server.ts`](app/packages/shared/src/env.server.ts) and [`env-client.ts`](app/packages/shared/src/env-client.ts).

**Server**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Redis |
| `EMAIL_SERVER_HOST`, `EMAIL_SERVER_PORT`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`, `EMAIL_FROM`, `EMAIL_SECURE` | SMTP for transactional email (password reset, OTP) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google sign-in |
| `MINIO_*` | Object storage |
| `TZ` | Time zone (default `Africa/Casablanca`) |

**Client (build time)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL`, `VITE_APP_URL` | API and site origins (used for SSR only, see [Known pitfalls](#known-pitfalls)) |
| `VITE_STRAPI_URL`, `VITE_STRAPI_FETCH_URL`, `VITE_STRAPI_MEDIA_URL`, `VITE_CMS_API_URL`, `VITE_CMS_IMG_URL` | Strapi endpoints |
| `VITE_STRAPI_CONTRIBUTE_TOKEN` | Strapi token used for contribution uploads |

**Strapi** (`app/apps/strapi/.env`): `HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`.

## API

All endpoints are under `/api/v1`. Interactive docs (Scalar) are at **`/api/v1/openapi/reference`**, and the raw spec is at `/api/v1/openapi/spec.json`.

| Route | Description |
|---|---|
| `/users`, `/profile` | User management and the current user's profile |
| `/notifications` | In-app notifications |
| `/media`, `/upload-media` | Media records and uploads |
| `/authors`, `/books` | NeoAlexandria authors and books (from Strapi) |
| `/requested-books` | Book requests |
| `/gc-contributions`, `/comments` | Great Conversation references and their comments |
| `/home-philosophers` | Philosophers shown in the landing-page hero and globe |
| `/teams`, `/contributors`, `/partners`, `/partnerships` | Team, scholars and institutions |

## Content model (Strapi)

| Content type | Key fields |
|---|---|
| **Author** | first/last name, gender, birth–death, picture, expert, YouTube link → books |
| **Book** | title, subtitle, original publication date, translator, translation date, contributor, submitted files → author, GC contributions |
| **GC Contribution** | book A / book B, excerpts, connection type and nature, evidence flags, explanation → comments |
| **GC Comment** | comment, contributor → contribution |
| **Requested book** | book name, author name, requester email |
| **Home Philosopher** | name, dates, era, school, image, hero quote and placement, city/country/coordinates for the globe |
| **Team** | name, role, category, affiliation, description, picture |
| **Contributing scholars** | name, role, affiliation, description, picture |
| **Partner institutions** / **Partnership** | name, logo, role, description, display order |

## Deployment

Production runs on a **Replit autoscale deployment** and is served at **legacy-project.io**.

- **Build:** [`scripts/build-prod.sh`](scripts/build-prod.sh) installs dependencies, builds the shared packages, generates the Prisma client, pushes the schema, makes sure the `strapi` schema exists, builds Admin, Client and Strapi, and grants the Strapi Public role its API permissions.
- **Start:** [`scripts/start-prod.sh`](scripts/start-prod.sh) starts Redis, then nginx right away so the health check passes. It then seeds uploads to object storage once (guarded by a sentinel) and runs Strapi, API, Admin and Client under restart-on-exit watchdogs.
- **Content sync:** Replit migrates the database *schema* to production, not its *rows*. To push Team changes, set `STRAPI_SYNC_TEAM=1` for one deploy. That applies [`scripts/sync-team-prod.sql`](scripts/sync-team-prod.sql), which is surgical and idempotent. Unset the flag afterwards.

## Known pitfalls

- **Stale `dist/` in shared packages.** `@repo/server` is consumed from its compiled `dist/`. If the dev API returns 500 on every route with `Cannot read properties of undefined (reading 'parse')`, rebuild with `pnpm --filter @repo/server build`, or keep `pnpm --filter @repo/server dev` running.
- **Same-origin requests in the browser.** Production is served at `legacy-project.io`, but `VITE_API_URL`/`VITE_APP_URL` are baked in at build time. Browser code must use relative URLs or `window.location.origin`, or the cross-origin requests fail on CORS.
- **Never force-import a full Strapi export into production.** It overwrites every content type and can delete media stored in object storage. Push one content type at a time, idempotently.
- **Optional media fields.** When a Strapi media field is optional, null-guard it in the server transform and mark it nullable in the output schema.
- **Strapi version.** `@strapi/strapi@5.23.0` is flagged for a critical CVE and blocked by some package firewalls, so fresh installs can fail. Upgrade Strapi to fix this.

## Contact

For questions, partnerships or to join the expert network, use the [Contact page](https://legacy-project.io/contact-us).

## License

LEGACY is free software, licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).
