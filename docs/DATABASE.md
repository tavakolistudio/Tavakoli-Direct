# Database

PostgreSQL via Prisma. CUID primary keys, `createdAt`/`updatedAt` timestamps, UTC storage,
soft-delete (`deletedAt`) where useful, and indexes tuned for inbox + reporting queries.

## Entities

| Model | Purpose |
|-------|---------|
| `User`, `Session` | Auth: ADMIN/OPERATOR users; revocable sessions (token hash only). |
| `Client`, `ClientUserAccess` | Managed businesses; which operators may access which clients. |
| `InstagramAccount` | Public account data + status/token/webhook state. |
| `InstagramCredential` | **Encrypted** access token (AES-256-GCM), isolated from public data. |
| `ProviderCapability` | Per-account feature flags (story reply, quick replies…). |
| `Automation`, `AutomationTrigger`, `AutomationStep` | Rules: trigger + ordered actions. |
| `AutomationExecution` | Audit of each evaluation (matched/skipped/blocked/executed + trace). |
| `Contact`, `Lead`, `Tag`, `ContactTag` | People, lead status, tagging. |
| `Conversation`, `Message`, `InternalNote`, `ConversationAssignment` | Shared inbox. |
| `WebhookEvent` | Idempotent raw event store (retention-limited). |
| `OutboundJob` | Queued provider sends; idempotency key prevents duplicates. |
| `UploadedAsset` | Media/logo metadata. |
| `AuditLog` | Critical-action trail (no secrets). |
| `AppSetting` | Platform settings (JSON). |

## Key constraints & indexes

- `InstagramAccount.providerAccountId` unique; `Contact (instagramAccountId, scopedUserId)` unique.
- `Message (conversationId, providerMessageId)` unique → dedupe on delivery/echo.
- `WebhookEvent.idempotencyKey` unique, `OutboundJob.idempotencyKey` unique → no double-processing/sending.
- Indexes on `Conversation (instagramAccountId, status)`, `needsHuman`, `lastMessageAt`;
  `Message (conversationId, createdAt)`; `Contact.lastInteractionAt`; `AuditLog.createdAt`.

## Message shape

`direction` (INBOUND/OUTBOUND), `type`, `senderType` (CONTACT/AUTOMATION/OPERATOR/SYSTEM),
`providerMessageId`, `deliveryStatus`, `automationId`/`automationExecutionId`, `operatorId`,
`body`, `attachments`, `createdAt`, `providerTimestamp`, `errorCategory`/`errorDetail`.

## Migrations & seed

```bash
pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev (creates/apply migrations)
pnpm --filter @tavakoli/database migrate:deploy   # CI/prod: apply committed migrations
pnpm db:seed          # dev seed (admin/operator, demo client, mock account, sample data)
```

A baseline migration is committed at `packages/database/prisma/migrations/00000000000000_init`.
