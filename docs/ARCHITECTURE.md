# Architecture

Tavakoli Direct is a pnpm + Turborepo TypeScript monorepo split into two deployable
apps and five shared packages.

```
apps/
  web/      Next.js App Router — Persian RTL UI, server actions, API + webhook endpoints
  worker/   BullMQ consumers — automation execution + outbound provider calls
packages/
  config/        Zod-validated env + shared constants (queue names, Meta API version)
  core/          pure domain logic — no DB, no framework
  database/      Prisma schema, client, AES-256-GCM credential crypto, seed
  integrations/  InstagramMessagingProvider (mock + meta) + signature verification
  ui/            shadcn-style, RTL-aware React components
```

## Request & event flows

### 1. Inbound webhook → inbox (async)

```
Instagram/Meta ──POST──▶ web /api/webhooks/instagram
                              │ 1. verify X-Hub-Signature-256 (meta) — reject if invalid
                              │ 2. provider.parseWebhook → NormalizedInstagramEvent[]
                              │ 3. per event: idempotency key; insert WebhookEvent (unique)
                              │    → duplicate key ⇒ skip (never processed twice)
                              │ 4. enqueue `webhook-events`; return 200 fast
                              ▼
                     Redis (BullMQ) ──▶ worker: webhook-events
                              │ 5. upsert Contact, find/create Conversation
                              │ 6. store inbound Message  ← appears in inbox now
                              │ 7. core.evaluate(event, automations, ctx)
                              │      matching → priority → cooldown/limits
                              │ 8. winner? apply non-message actions;
                              │    create OutboundJob(s) + enqueue `outbound-messages`
                              │    no match ⇒ mark conversation NEEDS_HUMAN (handoff)
                              ▼
                     worker: outbound-messages
                              │ 9. provider.sendText/… (ONLY place sends happen)
                              │ 10. success ⇒ store outbound Message (deduped)
                              │     failure ⇒ map error; retry (backoff) or DEAD + handoff
```

The webhook endpoint never runs automation synchronously — it only persists and
enqueues, so Meta always gets a fast 200.

### 2. UI mutations

Server Components read Postgres directly (via Prisma) at request time (all pages are
`force-dynamic`). Mutations go through **server actions** that validate with Zod, enforce
RBAC (`requireUser`/`requireAdmin`/`assertClientAccess`), write to the DB, and audit-log.

### 3. Dry-run tester

The automation dry-run uses the **same** `core.evaluate` function as the worker, so the
preview (match reason, winning automation, planned actions, capability blocks) exactly
mirrors production — but sends nothing.

## Why two deploy targets

Webhook responses must be fast and Vercel serverless is a poor host for long-lived,
retrying, rate-limited queue consumers. The worker runs as a persistent Node service
(Railway/Render/Fly.io) with concurrency + per-account throttling. See ADR-0001.

## Provider abstraction

`INSTAGRAM_PROVIDER` selects `MockInstagramProvider` (default, no credentials) or
`MetaInstagramProvider` (official Graph API shapes, guarded by env validation). The app and
worker only ever call the `InstagramMessagingProvider` interface. Per-account
`ProviderCapability` rows drive honest UI states (supported / unavailable / config-required).

## Determinism & idempotency

- **Conflict resolution** (`core/priority`): active status → trigger type → explicit
  priority → match specificity → creation date. Exactly one primary response automation runs.
- **Idempotency**: inbound events keyed by provider message/comment id (or a stable
  composite); outbound jobs keyed by execution+conversation+step+content. A successful send
  is never duplicated.

## Data model

See [DATABASE.md](./DATABASE.md). Highlights: CUID ids, UTC timestamps, soft-delete where
useful, encrypted credentials isolated from public account data, indexes tuned for inbox and
reporting queries.
