# ADR 0001 — Foundational architecture decisions

Status: Accepted · Date: 2026-07-17

## Context

Tavakoli Direct is an **internal** Persian Instagram DM automation platform. It must run fully
in **mock mode** with no Meta credentials, be deployable with the web app on Vercel and a
persistent worker elsewhere, and keep provider-specific logic behind an interface.

## Decision 1 — Split web (Vercel) and worker (persistent Node)

Webhook endpoints live in the Next.js app and only **enqueue** work. All long-running,
retryable, rate-limited outbound provider calls run in a separate `apps/worker` process backed
by BullMQ + Redis. This keeps webhook responses fast (Meta requires a quick 200) and lets the
worker be deployed to Railway/Render/Fly.io where long-lived connections and concurrency
controls are available (Vercel serverless is a poor fit for queue consumers).

## Decision 2 — Custom credentials session auth instead of NextAuth v5 beta

The brief allows "Auth.js **or another stable, maintained authentication solution**." This is an
internal tool with **no public signup and no social login** — only email+password for
pre-created ADMIN/OPERATOR accounts. We implement a small, auditable auth layer:

- Password hashing: **Argon2id** via `@node-rs/argon2` (prebuilt binaries; no node-gyp).
- Session: a signed JWT (via `jose`) stored in an **httpOnly, Secure, SameSite=Lax** cookie.
- Login is **rate-limited** (Redis) and every attempt is audit-logged.

Rationale: avoids coupling to a beta configuration surface, keeps the security-critical path
small and reviewable, and satisfies all §17 security requirements. Trade-off: we own session
rotation/expiry logic (documented in SECURITY.md).

## Decision 3 — Provider abstraction with mock + meta implementations

`InstagramMessagingProvider` is the only surface the app/worker call. `INSTAGRAM_PROVIDER`
(`mock` | `meta`) selects the implementation. `MockInstagramProvider` makes the entire product
testable before real credentials exist. `MetaInstagramProvider` is implemented against official
Graph API shapes but is **guarded**: selecting it without valid credentials fails env validation.
Capabilities (e.g. story-reply, quick-replies) are queried per account so the UI can show
supported / unavailable / configuration-required states honestly.

## Decision 4 — Token encryption at rest with AES-256-GCM

Instagram credentials are stored in a separate `InstagramCredential` table, encrypted with
AES-256-GCM (authenticated encryption) using `APP_ENCRYPTION_KEY`. No custom crypto; raw tokens
are never sent to the browser and never logged.

## Decision 5 — Idempotency everywhere at the boundary

Webhook events get a deterministic idempotency key; duplicates are rejected before processing.
Outbound jobs carry idempotency keys so a successful provider response is never duplicated.

## Consequences

- Two deploy targets and a Redis dependency in every environment (covered by docker-compose).
- We maintain a little more auth code, in exchange for a smaller, clearer security surface.
- Mock mode is a first-class citizen and the default developer experience.
