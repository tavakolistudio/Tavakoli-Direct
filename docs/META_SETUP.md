# Meta / Instagram setup

> ⚠️ **Verify everything here against the current official Meta documentation at
> implementation time.** API versions, product names, permission names, and endpoints
> change. This project keeps the Graph API version in configuration
> (`META_GRAPH_API_VERSION`) — never hardcode it. Do **not** enable the `meta` provider until
> the steps below are complete and verified.
>
> 🧑‍💼 Steps marked **[Mohammad]** are manual actions in the Meta dashboard that only the app
> owner can perform.

The product runs fully in **mock mode** (`INSTAGRAM_PROVIDER=mock`) with none of this. Complete
this only when connecting real Instagram professional accounts.

## 0. Prerequisites

- A Meta **Business** account and a **Business/Professional Instagram** account for each client,
  each linked appropriately per current Meta requirements. **[Mohammad]**
- Admin access to the Meta App Dashboard. **[Mohammad]**

## 1. Create the Meta app **[Mohammad]**

1. Create an app in the Meta App Dashboard for a **Business** use case.
2. Add the current official **Instagram** product for messaging + comments (confirm the exact
   product name in the dashboard — it has changed over time).
3. Note the **App ID** and **App Secret** → `META_APP_ID`, `META_APP_SECRET`.

## 2. Configure OAuth / authorization **[Mohammad]**

1. Add the redirect URI: `${APP_URL}/api/integrations/meta/callback` → `META_REDIRECT_URI`.
2. Record the exact **permissions/scopes** the dashboard lists for Instagram messaging and
   comment management. **Copy the names verbatim from the App Review UI — do not guess them.**
   (Historically these have covered Instagram basic access, messaging, and comment management,
   but the exact strings must be taken from the current dashboard.)

## 3. Configure the webhook **[Mohammad]**

1. Webhook callback URL: `${APP_URL}/api/webhooks/instagram`.
2. Verify token: choose a random string → `META_VERIFY_TOKEN`. The GET handshake endpoint
   echoes `hub.challenge` only when the token matches.
3. Subscribe to the Instagram fields you need (e.g. messages, comments) — confirm the exact
   field names in the dashboard.
4. Meta signs POSTs with `X-Hub-Signature-256`; this app verifies it with `META_APP_SECRET`.

## 4. Test users & development mode **[Mohammad]**

- While the app is in **development mode**, only roles/test users on the app can be messaged.
- Add the internal team + test Instagram accounts as testers to validate end to end before review.

## 5. App Review & Business Verification **[Mohammad]**

- Prepare a screencast and clear use-case description for each requested permission.
- Complete **Business Verification** for the Business account.
- Submit the permissions recorded in step 2 for **App Review**. Production messaging to
  non-test users requires approved permissions.

## 6. Enable the provider

Once credentials + approvals are in place:

```env
INSTAGRAM_PROVIDER=meta
META_APP_ID=...
META_APP_SECRET=...
META_VERIFY_TOKEN=...
META_GRAPH_API_VERSION=v21.0   # confirm the current supported version
META_REDIRECT_URI=${APP_URL}/api/integrations/meta/callback
```

Env validation will refuse to boot in `meta` mode if `META_APP_ID`/`META_APP_SECRET`/
`META_VERIFY_TOKEN` are missing.

## 7. Capabilities & limitations

- Per-account features are tracked in `ProviderCapability`. Story-reply automation is behind a
  capability flag and shows **«این قابلیت با تنظیمات فعلی Meta در دسترس نیست.»** when
  unavailable.
- Private replies to comments are time-limited by Meta; the UI surfaces when a reply is blocked.
- The app does **not** import historical conversations; the inbox contains events received
  after connection.

## Common provider errors (mapped to Persian UI)

| Condition | Category | UI message |
|-----------|----------|------------|
| Token invalid/expired (code 190 / OAuthException) | `PROVIDER_AUTH` | اتصال پیج نیاز به تمدید دارد. |
| Missing permission (10 / 200 / 803) | `PROVIDER_PERMISSION` | مجوز لازم در دسترس نیست. |
| Rate limit (4 / 17 / 32 / 613 / HTTP 429) | `PROVIDER_RATE_LIMIT` | محدودیت موقت — بعداً تلاش کنید. |
| Transient 5xx | `PROVIDER_TEMPORARY` | ارسال موقتاً ناموفق بود؛ تلاش مجدد. |
| Other | `PROVIDER_PERMANENT` | ارسال این پیام ممکن نیست. |

Never use undocumented endpoints. Never request or store Instagram passwords.
