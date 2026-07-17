# Tavakoli Direct

> **خدمات هوشمند دایرکت ویژه مشتریان Tavakoli Studio**
> Internal Persian Instagram Direct-message automation & lead-management platform for
> Instagram pages managed by Tavakoli Studio.

This is an **internal tool**, not a public SaaS. There is no public registration, no billing,
and no self-service onboarding. Administrators and operators at Tavakoli Studio use it to
connect client Instagram professional accounts, build simple automations, run a shared inbox,
and manage leads.

The entire product runs **end-to-end in mock mode with no Meta credentials**, so development,
testing, and demos work without touching the real Instagram Graph API.

---

## Contents

- [Architecture](#architecture)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Development commands](#development-commands)
- [Mock event testing](#mock-event-testing)
- [Tests](#tests)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Security & privacy](#security--privacy)

---

## Architecture

A pnpm + Turborepo TypeScript monorepo:

```
apps/
  web/       Next.js (App Router) — Persian RTL UI, API + webhook endpoints (deploy to Vercel)
  worker/    BullMQ queue consumers — outbound messages & async processing (deploy to Railway/Render/Fly.io)
packages/
  config/        env validation (Zod) + shared constants
  core/          pure domain logic: Persian normalization, trigger matching, priority, cooldowns, errors
  database/      Prisma schema, client, seed
  integrations/  InstagramMessagingProvider abstraction (mock + meta)
  ui/            shadcn-style, RTL-aware React components
```

The web app receives webhooks and only **enqueues** jobs; the worker performs all outbound
provider calls with retries, backoff, and per-account throttling. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requirements

- **Node.js** ≥ 20.11
- **pnpm** 9 (`corepack enable pnpm` or `npm i -g pnpm@9.15.0`)
- **Docker** (for local PostgreSQL + Redis), or your own Postgres 16 & Redis 7

## Local setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment and (for mock mode) leave Meta values blank
cp .env.example .env

# 3. Start Postgres + Redis
pnpm infra:up

# 4. Create the schema and seed demo data
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 5. Run web + worker
pnpm dev
```

Web runs on http://localhost:3000, worker on http://localhost:3001.

**Demo credentials (development only — never enabled in production):**

| Role     | Email                       | Password        |
|----------|-----------------------------|-----------------|
| ADMIN    | `admin@tavakoli.local`      | `Admin!12345`   |
| OPERATOR | `operator@tavakoli.local`   | `Operator!12345`|

## Environment variables

See [.env.example](.env.example). Highlights:

- `INSTAGRAM_PROVIDER=mock` — no Meta credentials required (default).
- `AUTH_SECRET` — ≥ 32 chars (`openssl rand -base64 48`).
- `APP_ENCRYPTION_KEY` — 32-byte base64 key (`openssl rand -base64 32`) for token encryption at rest.
- `META_*` — only required when `INSTAGRAM_PROVIDER=meta`; validated at startup.

## Database

```bash
pnpm db:migrate      # apply migrations (dev)
pnpm db:seed         # seed admin/operator + demo client, account, contacts, automations
pnpm db:studio       # open Prisma Studio
```

Schema and reasoning: [docs/DATABASE.md](docs/DATABASE.md).

## Development commands

| Command            | Description                                   |
|--------------------|-----------------------------------------------|
| `pnpm dev`         | Run web + worker in watch mode                |
| `pnpm build`       | Production build of every package/app         |
| `pnpm lint`        | ESLint across the monorepo                     |
| `pnpm typecheck`   | `tsc --noEmit` across the monorepo             |
| `pnpm test`        | Vitest unit + integration tests                |
| `pnpm test:e2e`    | Playwright end-to-end tests                     |
| `pnpm format`      | Prettier write                                 |

## Mock event testing

In development, open **`/dev/mock-events`** (admin-only, never available in production) to
generate incoming DMs, comments, story replies, delivery success/failure, token expiration,
webhook retries, duplicate webhooks, and rate-limit errors. Generated events pass through the
**same** normalization → queue → automation pipeline as real events. See
[docs/TESTING.md](docs/TESTING.md).

## Tests

```bash
pnpm test        # unit + integration (Vitest)
pnpm test:e2e    # end-to-end (Playwright)
```

## Production build

```bash
pnpm build
```

## Deployment

- **Web → Vercel** (Next.js App Router).
- **Worker → Railway / Render / Fly.io** (persistent Node service).
- Managed PostgreSQL and Redis.

Full steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
- [docs/META_SETUP.md](docs/META_SETUP.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/SECURITY.md](docs/SECURITY.md)
- [docs/TESTING.md](docs/TESTING.md)
- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/OPERATOR_GUIDE_FA.md](docs/OPERATOR_GUIDE_FA.md) — راهنمای اپراتور (فارسی)

## Security & privacy

Argon2id password hashing, httpOnly session cookies, Zod validation, server-side RBAC,
rate-limited login, AES-256-GCM token encryption at rest, webhook signature verification,
CSV-injection-safe exports, and audit logging. Access tokens are never sent to the browser.
See [docs/SECURITY.md](docs/SECURITY.md).

> The privacy features (contact data export/deletion, webhook retention, log redaction) are
> technical controls, **not** an automatic legal-compliance certification.
