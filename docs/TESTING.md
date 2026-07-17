# Testing

## Commands

```bash
pnpm test            # all unit + integration (Vitest) across the monorepo
pnpm --filter @tavakoli/core test           # domain unit tests only
pnpm test:e2e        # Playwright end-to-end (needs infra + seed + built app)
```

## What runs where

### Unit (Vitest) — no infrastructure required

- **`packages/core`** (49 tests): Persian normalization (letter/digit/diacritic/ZWNJ
  handling), keyword matching (EXACT / CONTAINS / STARTS_WITH / ANY_OF), priority/conflict
  resolution, cooldown + max-executions, timezone-aware business hours, provider error
  mapping, evaluation engine, CSV-injection escaping, phone normalization.
- **`packages/config`** (4): env validation incl. "mock mode needs no Meta creds".
- **`packages/integrations`** (13): webhook signature verify (valid/invalid/tampered/wrong
  secret), mock provider (capabilities, parse, marker-based error simulation), Meta webhook
  normalization (DM/comment/echo-filter).
- **`packages/database`** (3): AES-256-GCM token encryption round-trip + tamper detection.
- **`apps/web`** (6): Argon2id hash/verify, Persian date formatting.

### Integration (Vitest, DB-backed) — Postgres + Redis

- **`apps/worker` webhook-event.integration.test**: seeds a client/account/automation, pushes
  a DM through `processWebhookEvent`, and asserts contact + conversation + inbound message +
  outbound job creation, execution-count increment, **idempotent reprocessing**, and
  **human handoff** when nothing matches. It probes connectivity in `beforeAll` and **skips
  gracefully** when infra is absent; in CI (service containers) it runs for real.

### End-to-end (Playwright) — `apps/web/e2e/mvp-flow.spec.ts`

Covers the acceptance critical path: admin login → create client → create keyword automation
→ **dry-run** (no real send) → open a seeded conversation → add internal note → resolve.
Steps 5–7 (mock DM → queued reply → inbox) are covered by the worker integration test, which
drives the identical pipeline.

## Running the full stack locally for e2e

```bash
pnpm infra:up
pnpm db:migrate && pnpm db:seed
pnpm --filter @tavakoli/web build
pnpm test:e2e
```

## CI

`.github/workflows/ci.yml` runs on every PR with Postgres + Redis service containers:
install → prisma generate → migrate deploy → format check → lint → typecheck → test →
production build. No real Meta credentials — the mock provider is used
(`INSTAGRAM_PROVIDER=mock`).
