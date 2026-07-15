# Exofe Backend — Implementation Summary

Last updated: 2026-07-14 (email delivery added)

## What's Built

### Authentication System (complete)

Full JWT-based auth matching `Frontend/docs/API_CONTRACT.md`. All 8 endpoints are live.

**Endpoints:**

| Method | Path | Status | Response |
|---|---|---|---|
| POST | `/auth/signup` | 201 | `{"token": "..."}` |
| POST | `/auth/login` | 200 / 401 | `{"token": "..."}` or `{"message": "Incorrect email or password"}` |
| POST | `/auth/otp/request` | 200 | `{"message": "Code sent"}` |
| POST | `/auth/otp/verify` | 200 / 401 | `{"token": "..."}` |
| POST | `/auth/forgot-password` | 200 | `{"message": "..."}` |
| POST | `/auth/reset-password` | 200 / 400 | `{"message": "..."}` |
| POST | `/auth/verify-email` | 200 / 400 | `{"message": "..."}` |
| POST | `/auth/logout` | 200 | `{"message": "Logged out"}` |

**Signup flow:**
1. Validates input (Pydantic) — email regex, password min 8 chars, country code PK/KR/AE
2. Checks for duplicate email → 422 with `{"message": "...", "errors": {"email": "..."}}`
3. Creates `users` row (role=owner, password hashed with bcrypt)
4. Creates `businesses` row (owner_id → new user, name = "{firstName}'s Business")
5. Back-fills `users.business_id` → the new business
6. Issues JWT with claims: `sub` (user_id), `business_id`, `role`, `iat`, `exp`

**JWT payload:**
```json
{
  "sub": "uuid-of-user",
  "business_id": "uuid-of-business-or-null",
  "role": "owner",
  "iat": 1720000000,
  "exp": 1720003600
}
```
Token expires in 1 hour. Algorithm: HS256. Secret: `JWT_SECRET` env var.

**Password hashing:** bcrypt via `passlib[bcrypt]`.

**OTP / Reset / Verify tokens:** Currently stored in-memory (Python dicts). OTP codes, reset tokens, and verification tokens are sent via **Resend** transactional email (see `email_service.py`). Codes are also logged to console as a fallback.

**Security Hardening applied:**
- **OTP rate limiting:** Max 5 attempts per OTP to prevent brute-force attacks.
- **Constant-time comparison:** Using `hmac.compare_digest` for OTP validation to prevent timing side-channels.
- **SQLi protection:** Strict allowlist for `update_user_fields` to prevent arbitrary column injection.
- **Token invalidation:** Generating a new password reset token automatically invalidates any prior tokens for that email.
- **Token expiry:** Email verification tokens have a strict 24-hour TTL (in addition to OTP's 5 min and Reset's 1 hour).

---

### Infrastructure (complete)

| Component | File | What it does |
|---|---|---|
| Config | `app/config.py` | `pydantic-settings` — reads all env vars from `.env` at startup, crashes early if any are missing |
| DB session | `app/database/session.py` | SQLAlchemy engine + `get_db()` FastAPI dependency (yields session, closes in finally) |
| Schema | `app/database/exofe_schema.sql` | All 18 tables + indexes + full RLS policies (aligned with `Frontend/docs/DATABASE.md`) |
| Schema init | `app/database/init_db.py` | Runs `schema.sql` against Supabase with retry loop |
| Logger | `app/core/logger.py` | Rotating file handler (5MB, 5 backups) + console output |
| Security | `app/core/security.py` | `hash_password`, `verify_password` (bcrypt), `create_access_token`, `decode_access_token` (python-jose) |
| Dependencies | `app/core/dependencies.py` | `get_current_user` — decodes Bearer JWT → `CurrentUser(user_id, business_id, role)` |
| Main | `app/main.py` | FastAPI app, CORS, validation error handler (converts to frontend's expected error shape), health check |

---

### Database Schema (18 tables)

Source of truth: `app/database/exofe_schema.sql` (aligned with `Frontend/docs/DATABASE.md`)

| Table | Tenancy | Purpose |
|---|---|---|
| `users` | `business_id` (nullable) | Login accounts — owners, staff, Exofe admins |
| `businesses` | — (IS the tenant) | One row per client |
| `subscriptions` | `business_id` | Plan: starter / growth / business |
| `payments` | `business_id` | Subscription payment history |
| `categories` | `business_id` | Product categories |
| `products` | `business_id` | Product catalog |
| `product_images` | via product_id | Multiple images per product (R2 URLs) |
| `customers` | `business_id` | WhatsApp end-customers (never log in) |
| `customer_notes` | via customer_id | Staff notes on customers |
| `orders` | `business_id` | Orders from AI or staff |
| `order_items` | via order_id | Line items with price snapshots |
| `whatsapp_message_logs` | `business_id` | All inbound/outbound messages |
| `ai_settings` | `business_id` (unique) | Business prompt, tone, greeting, handover flag |
| `faqs` | `business_id` | FAQ pairs for AI |
| `admin_logs` | — | Exofe admin audit trail |
| `feature_flags` | `business_id` (nullable) | Global or per-business feature toggles |
| `waitlist` | — | Early access email signups |
| `demo_leads` | — | Demo booking leads |

**RLS policies:** Every tenant table has RLS enabled. Business owners see only their own data. Exofe admins (`role=admin`, `business_id IS NULL`) see everything. FastAPI service role bypasses RLS for webhook/bot writes.

---

## File Map

```
Backend/
├── app/
│   ├── main.py                        # FastAPI app, CORS, error handler, health check
│   ├── config.py                      # Settings(BaseSettings) — env var source of truth
│   │
│   ├── database/
│   │   ├── exofe_schema.sql           # 18 tables + indexes + RLS
│   │   ├── init_db.py                 # Runs schema against Supabase
│   │   └── session.py                 # Engine + get_db()
│   │
│   ├── core/
│   │   ├── logger.py                  # Rotating log setup
│   │   ├── security.py                # Argon2 + JWT (pwdlib, PyJWT)
│   │   ├── dependencies.py            # get_current_user dependency
│   │   └── exceptions.py              # (empty — AuthError lives in auth_service for now)
│   │
│   ├── api/
│   │   ├── webhook.py                 # (stub) WhatsApp webhook
│   │   └── v1/
│   │       ├── __init__.py            # Mounts all routers
│   │       ├── auth.py                # ✅ 8 endpoints — IMPLEMENTED
│   │       ├── dashboard.py           # (stub) router only
│   │       ├── whatsapp.py            # (stub) router only
│   │       ├── products.py            # (stub) router only
│   │       ├── orders.py              # (stub) router only
│   │       ├── customers.py           # (stub) router only
│   │       ├── ai.py                  # (stub) router only
│   │       ├── billing.py             # (stub) router only
│   │       ├── settings.py            # (stub) router only
│   │       ├── admin.py               # (stub) router only
│   │       └── marketing.py           # (stub) router only
│   │
│   ├── services/
│   │   ├── auth_service.py            # ✅ Signup, login, OTP, reset, verify — IMPLEMENTED
│   │   ├── email_service.py           # ✅ Resend transactional emails (OTP, reset, verify) — IMPLEMENTED
│   │   ├── conversation_service.py    # (stub)
│   │   ├── cart_service.py            # (stub)
│   │   ├── order_service.py           # (stub)
│   │   └── catalog_service.py         # (stub)
│   │
│   ├── repositories/
│   │   ├── user_repository.py         # ✅ get_by_email, get_by_id, create_user, create_business, update_fields — IMPLEMENTED
│   │   ├── business_repository.py     # (stub)
│   │   ├── product_repository.py      # (stub)
│   │   ├── order_repository.py        # (stub)
│   │   ├── customer_repository.py     # (stub)
│   │   └── message_repository.py      # (stub)
│   │
│   ├── models/
│   │   ├── auth.py                    # ✅ Pydantic schemas with camelCase support — IMPLEMENTED
│   │   ├── product.py                 # (stub)
│   │   ├── order.py                   # (stub)
│   │   └── customer.py                # (stub)
│   │
│   └── ai/
│       ├── intent_parser.py           # (stub)
│       ├── prompt.py                  # (stub)
│       └── whatsapp_client.py         # (stub)
│
├── .env                               # Real secrets (NEVER commit)
├── .env.example                       # Same keys, blank values
├── pyproject.toml                     # uv dependencies
└── SUMMARY.md                         # ← this file
```

## Environment Variables

```
DATABASE_URL          # PostgreSQL connection string (Supabase Session Pooler)
JWT_SECRET            # HS256 signing secret
RESEND_API            # Resend API key for transactional emails
FRONTEND_URL          # Frontend origin for email links (default: http://localhost:3000)
REDIS_URL             # Redis (not yet used — needed for OTP/reset token storage)
WHATSAPP_WEBHOOK_VERIFY_TOKEN
WHATSAPP_CLOUD_API_TOKEN
R2_ACCESS_KEY_ID      # Cloudflare R2 (not yet used)
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
AI_API_KEY            # Gemini / OpenRouter (not yet used)
```

## Error Response Format

All endpoints return errors in this shape (matching `Frontend/docs/API.md`):

```json
{
  "message": "Human readable summary",
  "errors": {
    "field_name": "Specific message for this field"
  }
}
```

`errors` is only present on 422 validation failures. Other errors just have `message`.

## What's NOT Built Yet

- ~~**Email delivery**~~ — ✅ Done. OTP, password reset, and email verification emails are sent via Resend.
- **Marketing endpoints** — `POST /waitlist`, `POST /demo/book` (stubs exist, frontend already calls these)
- **Products CRUD** — `GET/POST/PATCH/DELETE /products`, categories, images
- **Orders CRUD** — `GET/POST/PATCH /orders`
- **Customers** — `GET /customers`, notes
- **Dashboard** — `GET /dashboard/summary`, analytics
- **WhatsApp webhook** — `GET/POST /webhook` (Meta verification + message ingestion)
- **AI pipeline** — intent parser, product search, order creation flow
- **AI settings / FAQs** — CRUD for business AI configuration
- **Billing** — subscription management
- **Settings** — business info, team members
- **Admin panel** — platform-wide management endpoints
- **Redis integration** — caching + Celery broker
- **Cloudflare R2** — file upload for product images / logos

## How to Use `get_current_user` in Future Routes

Any protected endpoint can inject the authenticated user like this:

```python
from typing import Annotated
from fastapi import Depends
from app.core.dependencies import get_current_user, CurrentUser

@router.get("/products")
def list_products(
    user: Annotated[CurrentUser, Depends(get_current_user)],
    db: DbSession,
):
    # user.user_id, user.business_id, user.role are available
    products = product_repository.list_by_business(db, user.business_id)
    return products
```

The `CurrentUser` dataclass has: `user_id: str`, `business_id: str | None`, `role: str`.

## Build Order for Remaining Modules

Always follow this layer order:

```
1. repository  (raw SQL)
2. service     (business logic)
3. model       (Pydantic schemas)
4. route       (thin HTTP layer)
```

Suggested next modules:
1. ~~**Email delivery**~~ — ✅ Done
2. **Marketing endpoints** — frontend already calls these
3. **Products CRUD** — first full module through all 4 layers
4. **WhatsApp webhook** — the core of the product
