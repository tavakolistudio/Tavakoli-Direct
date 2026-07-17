# Deployment

Two independently deployed services + managed Postgres and Redis.

```
┌──────────────┐     ┌──────────────┐
│  web (Vercel)│     │ worker (Node)│
│  Next.js     │     │  BullMQ      │
└──────┬───────┘     └──────┬───────┘
       │  Postgres (shared)  │
       └─────────┬───────────┘
             Redis (shared, BullMQ + rate limit)
```

## 1. Provision infrastructure

- **PostgreSQL 16** (Neon, Supabase, Railway, RDS…). Copy its connection string to `DATABASE_URL`.
- **Redis 7** (Upstash, Railway, Redis Cloud…). Copy to `REDIS_URL`.

Apply migrations once (from CI or locally):

```bash
DATABASE_URL=... pnpm --filter @tavakoli/database migrate:deploy
```

## 2. Web → Vercel

- Import the repo; set **Root Directory** to `apps/web`.
- Framework preset: **Next.js**. Build uses the monorepo (`transpilePackages`).
- Add a **Build Command** that generates the Prisma client:
  `pnpm --filter @tavakoli/database generate && pnpm --filter @tavakoli/web build`
  (or set `prisma generate` in an install/postinstall step).
- Set env vars (see below). `APP_URL` = your Vercel URL.

## 3. Worker → Railway / Render / Fly.io

The worker is a long-running Node process. Use the provided `apps/worker/Dockerfile`
(build context = repo root):

```bash
docker build -f apps/worker/Dockerfile -t tavakoli-worker .
```

- **Railway/Render**: point at the Dockerfile; set env vars; expose port `3001` (health at
  `/health`). Start command is the image default (`node dist/index.js`).
- **Fly.io**: `fly launch` with the Dockerfile; set secrets via `fly secrets set`.

The worker and web **must share** the same `DATABASE_URL`, `REDIS_URL`, `APP_ENCRYPTION_KEY`,
and `INSTAGRAM_PROVIDER`.

## 4. Environment variables

See [.env.example](../.env.example). Required in both services:

| Var | Notes |
|-----|-------|
| `DATABASE_URL`, `REDIS_URL` | Managed Postgres + Redis. |
| `AUTH_SECRET` | ≥ 32 chars. |
| `APP_ENCRYPTION_KEY` | 32-byte base64; **same value** in web + worker. |
| `APP_URL`, `WORKER_URL` | Public URLs. |
| `INSTAGRAM_PROVIDER` | `mock` until Meta is configured, then `meta`. |
| `META_*` | Only when `INSTAGRAM_PROVIDER=meta` (see META_SETUP.md). |

## 5. Go-live checklist

- [ ] Migrations applied (`migrate:deploy`).
- [ ] Web + worker share encryption key, DB, Redis.
- [ ] `INSTAGRAM_PROVIDER=mock` for internal testing; switch to `meta` after App Review.
- [ ] Webhook URL (`$APP_URL/api/webhooks/instagram`) configured in the Meta app.
- [ ] `/dev/mock-events` is unreachable in production (guarded by `NODE_ENV`).
- [ ] Seed is **not** run in production (it refuses when `NODE_ENV=production`).
