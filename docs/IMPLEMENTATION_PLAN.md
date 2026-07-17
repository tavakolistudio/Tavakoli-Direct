# Tavakoli Direct — Implementation Plan

**Product:** خدمات هوشمند دایرکت ویژه مشتریان Tavakoli Studio
An internal Persian Instagram Direct-message automation & lead-management platform for
Instagram pages managed by Tavakoli Studio.

This document is the source of truth for scope, sequencing, and decisions. It is written
before the code and updated as phases complete.

---

## 1. Goals & non-goals

### Goals (MVP)

- Internal tool, **two roles**: `ADMIN`, `OPERATOR`. No public signup.
- Fully **Persian, RTL, mobile-first** interface.
- Works **end-to-end in mock mode** with **no Meta credentials** required.
- Automation engine: keyword DM, comment→private-reply, story-reply (capability-gated),
  outside-business-hours, and fallback-to-human triggers.
- Deterministic conflict resolution between competing automations.
- Shared inbox, contacts/leads, reports built only from stored events.
- Webhook pipeline with signature verification, idempotency, and async processing via BullMQ.
- Official-Meta adapter designed but **disabled** until credentials exist.

### Non-goals (explicitly out of scope for this MVP)

Public registration, subscription plans, online payments, customer self-service dashboards,
affiliate/reseller systems, WhatsApp/Telegram/SMS, bulk unsolicited messaging, mobile apps,
drag-and-drop flow builders, autonomous generative AI replies, unofficial Instagram APIs,
Instagram password collection, browser automation/scraping.

---

## 2. Architecture at a glance

```
apps/
  web/       Next.js (App Router) — UI + API routes + webhook endpoints (Vercel)
  worker/    BullMQ workers — queue consumers (Railway/Render/Fly.io)
packages/
  config/        env validation (Zod), shared constants, Meta API version
  core/          pure domain logic (normalization, matching, priority, cooldown, errors)
  database/      Prisma schema, client, seed
  integrations/  InstagramMessagingProvider abstraction (mock + meta)
  ui/            shadcn-style React components (RTL-aware)
docs/            architecture, deployment, security, testing, Meta setup, operator guide
```

- **Web** handles auth, RBAC, all screens, and receives webhooks. It only *enqueues* jobs;
  it never runs the full automation synchronously.
- **Worker** consumes queues: `webhook-events`, `automation-executions`, `outbound-messages`,
  `media-processing`, `maintenance`. It is the only place outbound provider calls happen.
- **Redis** backs BullMQ and rate-limiting. **Postgres** is the system of record (Prisma).

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detail and [adr/0001-architecture-decisions.md](./adr/0001-architecture-decisions.md) for the decision record.

---

## 3. Technology choices

| Concern         | Choice                                   | Notes |
|-----------------|------------------------------------------|-------|
| Language        | TypeScript (strict)                      | `any` avoided |
| Monorepo        | pnpm workspaces + Turborepo              | |
| Web framework   | Next.js 15 App Router + React 19         | Vercel-deployable |
| DB              | PostgreSQL + Prisma 6                     | UTC storage, CUIDs |
| Cache/queue     | Redis + BullMQ 5                          | |
| Auth            | Custom credentials session (jose JWT in httpOnly cookie) + `@node-rs/argon2` (Argon2id) | See ADR-2 |
| Validation      | Zod                                       | shared schemas |
| Styling         | Tailwind CSS 3 + shadcn-style components  | Vazirmatn font, RTL |
| Crypto          | Node `crypto` AES-256-GCM (authenticated) | token encryption at rest |
| Tests           | Vitest (unit/integration), Playwright (e2e) | |
| Lint/format     | ESLint + Prettier                         | |
| Local infra     | Docker Compose (Postgres + Redis)         | |

Exact versions are pinned in each `package.json` and chosen to be mutually compatible.

---

## 4. Phased execution

- **Phase 1 — Foundation:** monorepo, TS, lint/format, docker-compose, env validation, CI, this plan. ✅ target first
- **Phase 2 — Data + core domain:** Prisma schema; `packages/core` (normalization, matching, priority, cooldown, business-hours, errors) with unit tests.
- **Phase 3 — Integrations:** provider interface, `MockInstagramProvider`, `MetaInstagramProvider` (guarded), signature verification, error mapping.
- **Phase 4 — Web:** auth + RBAC, RTL layout + sidebar, all pages, webhook endpoints, dry-run tester, `/dev/mock-events`.
- **Phase 5 — Worker/queues/tests/CI/docs/PR:** BullMQ workers, integration + e2e tests, CI, documentation, build verification, push + PR.

After every phase: `format` → `lint` → `typecheck` → `test` → commit.

---

## 5. Assumptions (recorded instead of blocking)

1. **Auth:** "Auth.js or another stable, maintained authentication solution" — we use a lean,
   well-structured custom credentials session (jose + Argon2id) to avoid depending on a beta
   NextAuth v5 config surface for an internal tool with no OAuth login. Documented in ADR-2.
2. **Argon2:** `@node-rs/argon2` (prebuilt, Argon2id) is used instead of `argon2`/node-gyp for
   reliable cross-platform installs (Windows dev machine). Same algorithm and security profile.
3. **Meta Graph API version** lives in `packages/config` (`META_GRAPH_API_VERSION`, default set
   in `.env.example`) and must be verified against official docs before enabling the `meta` provider.
4. **Story-reply trigger** is behind a provider capability flag and shows an "unavailable with
   current Meta settings" message when not supported.
5. **Local file storage** is the default `STORAGE_PROVIDER`; S3-compatible is a documented future path.
6. Demo businesses (Tavakoli Studio, Yalova Farsi, …) are **seed-only**, never hardcoded in app logic.
7. Persian dates are formatted for display with the `fa-IR` locale; storage stays UTC.

---

## 6. Acceptance-criteria traceability

Every item in the brief's §27 maps to a concrete deliverable; see [TESTING.md](./TESTING.md)
for the test matrix and the e2e scenario that exercises the critical path
(login → create client → create keyword automation → dry-run → mock DM webhook → queued reply
→ inbox → operator note → resolve).
