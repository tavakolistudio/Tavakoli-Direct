# Security

## Authentication & sessions

- Passwords hashed with **Argon2id** (`@node-rs/argon2`, OWASP-aligned params).
- Session = signed JWT (jose, HS256) in an **httpOnly, Secure (prod), SameSite=Lax** cookie,
  backed by a `Session` row (hash of the token) so sessions are revocable and expirable.
- Login is **rate-limited** in Redis (5 attempts / 15 min per IP+email); failures are audited
  with a generic Persian error (no user enumeration).
- No public signup. Admins create accounts.

## Authorization (RBAC)

- Two roles: `ADMIN`, `OPERATOR`. Enforced **server-side** in every action/page via
  `requireUser` / `requireAdmin` / `assertClientAccess`.
- Operators are limited to their assigned clients (`ClientUserAccess`); all list/detail
  queries are scoped, preventing IDOR.
- Operators cannot view integration secrets, delete clients, change Meta credentials, or
  manage admins.

## Secrets & tokens

- `APP_ENCRYPTION_KEY` (32-byte) encrypts Instagram access tokens with **AES-256-GCM**
  (authenticated encryption; no custom crypto). Ciphertext, IV, and auth tag are stored in
  `InstagramCredential`, isolated from public `InstagramAccount` data.
- **Access tokens are never sent to the browser** and never logged. The worker decrypts them
  just-in-time for a send. The Meta settings page shows only presence ("تنظیم شده"), never values.
- Env is validated at startup (`packages/config`); Meta credentials are required only when
  `INSTAGRAM_PROVIDER=meta`.

## Webhooks

- `X-Hub-Signature-256` HMAC-SHA256 verified in constant time; invalid signatures are
  rejected (meta mode). Mock mode needs no signature.
- Idempotency keys reject duplicate processing. Raw payloads are retained per a configurable
  retention window (`WEBHOOK_PAYLOAD_RETENTION_DAYS`) and must not contain secrets.

## Input & output safety

- All mutations validate input with **Zod**.
- **CSV export** neutralizes formula-injection (`= + - @`, tab, CR) and quotes every cell.
- React escapes output by default (stored-XSS protection); we never `dangerouslySetInnerHTML`.
- File uploads (when enabled) are constrained by MIME allow-list and size limit
  (`UPLOAD_LIMITS`).

## Auditing & logging

- Critical actions are recorded in `AuditLog` (actor, action, entity, safe metadata, IP) —
  logins, client/account/automation changes, manual messages, exports, deletions, role changes.
- The worker logger **redacts** any key matching `token|secret|password|authorization`.
- End users never see stack traces; errors map to safe Persian messages by category
  (`core/errors`).

## Privacy controls

Technical controls (not a legal-compliance certification):
- Contact data **export** (CSV) and the ability to **delete** a contact's stored data.
- Configurable webhook payload **retention** with a maintenance job that purges old payloads.
- Log **redaction** of sensitive fields.

## Dependencies

- CI can run `pnpm audit`; keep `META_GRAPH_API_VERSION` and dependencies current.
- Native crypto only (Node `crypto`); no hand-rolled algorithms.
