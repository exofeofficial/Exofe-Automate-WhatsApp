-- ============================================================
-- EXOFE — WhatsApp AI Order Automation Platform
-- Schema version: aligned with Frontend/docs/DATABASE.md
-- ============================================================
-- Design decisions:
--   · Multi-tenancy via business_id on every tenant-scoped table.
--     Isolation is at the query/RLS layer, not infrastructure.
--   · Exofe admins: users.business_id IS NULL + role = 'admin'.
--   · UUID primary keys (gen_random_uuid()) — safe to expose in
--     API responses, no sequential enumeration risk.
--   · NUMERIC(10,2) for all money columns — never float or varchar.
--   · Timestamps are timestamptz (timezone-aware).
--   · stock = -1 means unlimited / untracked inventory.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- provides gen_random_uuid()

-- ============================================================
-- USERS
-- The people who can log into Exofe: business owners, staff,
-- and Exofe platform admins (business_id IS NULL for admins).
-- ============================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID,                          -- NULL for Exofe admins
    role                TEXT NOT NULL                  -- 'admin' | 'owner' | 'staff'
                            CHECK (role IN ('admin', 'owner', 'staff')),
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT,
    phone               TEXT,
    status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'invited')),
    country_code        TEXT                           -- 'PK' | 'KR' | 'AE'
                            CHECK (country_code IN ('PK', 'KR', 'AE')),
    email_verified_at   TIMESTAMPTZ,                   -- NULL until email is confirmed
    invite_token        TEXT UNIQUE,
    invite_token_expires_at TIMESTAMPTZ,                -- invite links are valid for 7 days
    accepted_at         TIMESTAMPTZ,                   -- when an invited member finished setup
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invited_at          TIMESTAMPTZ
);

-- ============================================================
-- BUSINESSES
-- One row per client account — the tenant anchor.
-- Every other tenant table references business_id → businesses.id
-- ============================================================

CREATE TABLE businesses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    industry                TEXT                   -- matches the category dropdown in
                                                   -- Settings > Business Profile on the frontend
                                CHECK (industry IN (
                                    'Fashion and Apparel', 'Food and Beverage', 'Electronics',
                                    'Beauty and Cosmetics', 'Home and Living', 'Grocery',
                                    'Services', 'Other'
                                )),
    description             TEXT,                  -- shown to customers and Meta
    support_email           TEXT,
    support_phone           TEXT,
    logo_url                TEXT,                  -- stored in Cloudflare R2
    whatsapp_number         TEXT,                  -- NULL until connected
    whatsapp_connected_at   TIMESTAMPTZ,           -- NULL until first successful connection
    whatsapp_phone_number_id TEXT,                 -- Meta's phone number id, needed to send messages
    whatsapp_waba_id       TEXT,                   -- WhatsApp Business Account id, needed to subscribe the webhook
    whatsapp_access_token  TEXT,                   -- per-tenant permanent token from Embedded Signup/manual setup
    shopify_shop_domain    TEXT,                   -- e.g. "my-store.myshopify.com", NULL until connected
    shopify_access_token   TEXT,                   -- permanent Admin API token from the OAuth install flow
    shopify_connected_at   TIMESTAMPTZ,            -- NULL until first successful connection
    delivery_charge         NUMERIC(10,2) NOT NULL DEFAULT 0,   -- flat fee per order
    delivery_areas          TEXT,
    delivery_estimated_time TEXT,
    cash_on_delivery        BOOLEAN NOT NULL DEFAULT TRUE,
    pickup_available        BOOLEAN NOT NULL DEFAULT FALSE,
    tax_rate                NUMERIC(5,2) NOT NULL DEFAULT 0,    -- percentage (e.g. 17.00 = 17%)
    tax_name                TEXT,
    prices_include_tax      BOOLEAN NOT NULL DEFAULT FALSE,
    payment_details         TEXT,                  -- free text (e.g. "JazzCash: 0300-1234567 —
                                                    -- Ali's Store") the AI reads back to a
                                                    -- customer who chooses to pay online
    language                TEXT NOT NULL DEFAULT 'en'
                                CHECK (language IN ('en', 'ur', 'ko', 'ar')),
    status                   TEXT NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'suspended')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now that businesses exists, add the FK from users.business_id
ALTER TABLE users
    ADD CONSTRAINT fk_users_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- Prevents two businesses from ever being connected to the same real
-- WhatsApp number at once (would silently misroute inbound webhook
-- messages to whichever business Postgres happens to return first —
-- see get_business_by_whatsapp_number). Indexed on digits-only so
-- formatting differences (+92 vs 92, spaces, dashes) still collide.
CREATE UNIQUE INDEX idx_businesses_whatsapp_number_unique
    ON businesses (regexp_replace(whatsapp_number, '[^0-9]', '', 'g'))
    WHERE whatsapp_number IS NOT NULL;

-- Same reasoning as the WhatsApp number index above — prevents one
-- Shopify store from ever being connected to two Exofe businesses at
-- once (would misroute webhooks unpredictably).
CREATE UNIQUE INDEX idx_businesses_shopify_shop_unique
    ON businesses (shopify_shop_domain)
    WHERE shopify_shop_domain IS NOT NULL;

-- ============================================================
-- SUBSCRIPTIONS
-- Tracks which Exofe plan a business is on.
-- ============================================================

-- One row per business, created the moment they sign up (plan='trial',
-- status='trialing', amount=0). Once they pick a paid plan, that same row
-- is updated in place — plan/status/amount/current_period_end all get
-- filled in, no second row.
CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    business_name       TEXT,                          -- denormalized copy of businesses.name,
                                                        -- so this row is readable at a glance
                                                        -- without joining businesses
    plan                TEXT NOT NULL
                            CHECK (plan IN ('trial', 'starter', 'growth', 'business')),
    status              TEXT NOT NULL
                            CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
    amount              NUMERIC(10,2) NOT NULL DEFAULT 0,   -- 0 while trialing
    current_period_end  TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- Subscription payment history for a business.
-- ============================================================

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount          NUMERIC(10,2) NOT NULL,
    currency        TEXT NOT NULL
                        CHECK (currency IN ('PKR', 'KRW', 'AED')),
    status          TEXT NOT NULL
                        CHECK (status IN ('succeeded', 'failed', 'refunded')),
    paid_at         TIMESTAMPTZ
);

-- ============================================================
-- CATEGORIES
-- Product categories, one set per business.
-- ============================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, name)   -- two categories with the same name in one business = error
);

-- ============================================================
-- PRODUCTS
-- ============================================================

CREATE TABLE products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    name              TEXT NOT NULL,
    sku               TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price  NUMERIC(10,2) CHECK (compare_at_price >= 0),
    stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft')),
    has_variants      BOOLEAN NOT NULL DEFAULT FALSE,
    shopify_product_id TEXT,               -- Shopify's product id, NULL for products created directly in Exofe
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lets catalog sync re-run safely (ON CONFLICT upsert) instead of
-- creating duplicate products every time.
CREATE UNIQUE INDEX idx_products_shopify_product_unique
    ON products (business_id, shopify_product_id)
    WHERE shopify_product_id IS NOT NULL;

-- ============================================================
-- PRODUCT IMAGES
-- A product can have more than one image.
-- Images are stored in Cloudflare R2; only the URL is saved here.
-- ============================================================

CREATE TABLE product_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,      -- Cloudflare R2 URL
    sort_order  INTEGER NOT NULL DEFAULT 0
);


-- ============================================================
-- PRODUCT OPTIONS
-- "Size", "Color", or a custom option name, with the values it can
-- take (e.g. name="Size", values=["S","M","L"]). Max 2 per product,
-- enforced at the app layer (MAX_OPTIONS in ProductFormPage.tsx).
-- ============================================================

CREATE TABLE product_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    values      TEXT[] NOT NULL DEFAULT '{}',
    sort_order  INTEGER NOT NULL DEFAULT 0
);


-- ============================================================
-- PRODUCT VARIANTS
-- One row per option-value combination (e.g. ["S","Red"]), each with
-- its own SKU/price/stock. option_values is ordered to match the
-- product's product_options order.
-- ============================================================
 
CREATE TABLE product_variants (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id     UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    option_values  TEXT[] NOT NULL,
    sku            TEXT NOT NULL DEFAULT '',
    price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    shopify_variant_id TEXT,               -- Shopify's variant id, NULL for variants created directly in Exofe
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_variants_shopify_variant_unique
    ON product_variants (product_id, shopify_variant_id)
    WHERE shopify_variant_id IS NOT NULL;

-- ============================================================
-- CUSTOMERS
-- WhatsApp end-customers. They never log in to Exofe.
-- A customer belongs to one business — the same WhatsApp number
-- messaging two different businesses is two separate rows.
-- ============================================================

CREATE TABLE customers (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    whatsapp_number       TEXT NOT NULL,
    browse_state          JSONB,          -- in-progress catalog browsing session (category/product/index), NULL when not browsing
    name                  TEXT,           -- pulled from WhatsApp profile if available
    total_spent           NUMERIC(10,2) NOT NULL DEFAULT 0,  -- running total, updated on order completion
    ai_window_started_at  TIMESTAMPTZ,    -- start of this customer's current 24h AI-billing
                                           -- conversation window (see ai_usage_service) — null
                                           -- until their first AI-handled message
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, whatsapp_number)   -- same number per business = same customer
);

-- ============================================================
-- CUSTOMER NOTES
-- Free-text notes staff can attach to a customer.
-- ============================================================

CREATE TABLE customer_notes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id),
    note        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- Created either by the AI pipeline or manually by staff.
-- ============================================================

CREATE TABLE orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id      UUID NOT NULL REFERENCES customers(id),
    status           TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new', 'confirmed', 'shipped', 'delivered', 'canceled')),
    payment_method   TEXT NOT NULL
                         CHECK (payment_method IN ('cod', 'online', 'jazzcash', 'easypaisa', 'stripe')),
    subtotal         NUMERIC(10,2) NOT NULL,
    delivery_charge  NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax              NUMERIC(10,2) NOT NULL DEFAULT 0,
    total            NUMERIC(10,2) NOT NULL,
    delivery_address TEXT,
    created_by       TEXT NOT NULL,    -- 'ai' or a user id (UUID as text)
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEMS
-- Line items. unit_price is a snapshot at order time —
-- it never changes even if the product price changes later.
-- ============================================================

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10,2) NOT NULL   -- price at the moment the order was placed
);

-- ============================================================
-- WHATSAPP MESSAGE LOGS
-- Every inbound and outbound message, kept for debugging and
-- for displaying conversation history in the dashboard.
-- whatsapp_message_id carries Meta's message ID and is used
-- for webhook idempotency — if it's already here, skip processing.
-- ============================================================

CREATE TABLE whatsapp_message_logs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
    direction            TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type         TEXT NOT NULL DEFAULT 'text'
                             CHECK (message_type IN ('text', 'image', 'voice')),
    content              TEXT,                -- message body, or a reference to stored media
    ai_generated         BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = reply came from the AI
    whatsapp_message_id  TEXT UNIQUE,         -- Meta's message ID, enforces idempotency
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI SETTINGS
-- One row per business. Controls how the AI assistant behaves
-- for that specific business.
-- ============================================================

CREATE TABLE ai_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
    business_prompt     TEXT,           -- free text describing the business, injected into every AI call
    tone                TEXT NOT NULL DEFAULT 'friendly'
                            CHECK (tone IN ('friendly', 'formal', 'brief')),
    greeting_message    TEXT,           -- first reply sent to a new conversation
    handover_enabled    BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = every message goes to human
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI USAGE
-- One row per business. Enforces each plan's AI conversation limit
-- (see PLAN_AI_LIMITS in app/services/ai_usage_service.py, and the
-- "X conversations/month" copy on the pricing page).
--
-- window_count/window_started_at/blocked_at enforce the actual limit:
-- once window_count hits the plan cap, blocked_at is stamped and the
-- AI hands every message to a human for a 5 hour cooldown, after which
-- the window fully resets — the AI is never down for more than a few
-- hours at a time, even on the Starter plan.
--
-- month_count/month_started_at is a separate, purely informational
-- counter (resets on the 1st of each calendar month) used only to
-- show "742 / 1,000 conversations this month" on the dashboard. It
-- does not gate anything.
-- ============================================================

CREATE TABLE ai_usage (
    business_id         UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    window_count        INTEGER NOT NULL DEFAULT 0,
    window_started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_at          TIMESTAMPTZ,
    month_count         INTEGER NOT NULL DEFAULT 0,
    month_started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FAQS
-- Question/answer pairs a business owner writes. The AI pulls
-- from these directly when a customer question matches.
-- ============================================================

CREATE TABLE faqs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN LOGS
-- Audit trail for actions taken by Exofe platform admins.
-- ============================================================

CREATE TABLE admin_logs (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id           UUID NOT NULL REFERENCES users(id),
    action             TEXT NOT NULL,      -- e.g. 'suspended business', 'changed plan'
    target_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FEATURE FLAGS
-- Turn features on/off globally (business_id IS NULL)
-- or for a specific business only.
-- ============================================================

CREATE TABLE feature_flags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         TEXT NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE  -- NULL = global flag
);

-- ============================================================
-- MARKETING (not in DATABASE.md but needed for live frontend)
-- ============================================================

CREATE TABLE waitlist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE demo_leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL,
    billing_country TEXT NOT NULL,
    country_code    TEXT NOT NULL CHECK (country_code IN ('PK', 'KR', 'AE')),
    phone           TEXT NOT NULL,
    team            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INTERACTIVE MESSAGES
-- ============================================================

CREATE TABLE interactive_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    template            TEXT NOT NULL
                            CHECK (template IN ('order_confirmation', 'payment_reminder',
                                                 'delivery_update', 'welcome_message', 'custom')),
    prompt              TEXT NOT NULL DEFAULT '',
    body_text           TEXT NOT NULL DEFAULT '',
    kind                TEXT NOT NULL CHECK (kind IN ('buttons', 'list')),
    buttons             JSONB NOT NULL DEFAULT '[]',       -- [{id, text}], max 3 (WhatsApp's own limit)
    list_button_label   TEXT NOT NULL DEFAULT '',
    list_rows           JSONB NOT NULL DEFAULT '[]',       -- [{id, title}], max 10 (WhatsApp's own limit)
    trigger             TEXT NOT NULL
                            CHECK (trigger IN ('after_order_created', 'after_payment',
                                                'after_shipping', 'manual')),
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WHATSAPP MESSAGE TEMPLATES
-- Real Meta Business Message Templates (not the interactive_messages
-- above — those are live-conversation button/list messages that never
-- touch Meta's review queue). Every row here is one business's own
-- activated copy of one of the platform's starter templates, submitted
-- for approval under that business's own WABA (templates aren't shared
-- across WABAs, so the same starter gets its own row/approval per
-- business — see app/services/template_service.py STARTER_TEMPLATES).
-- ============================================================

CREATE TABLE whatsapp_templates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    key               TEXT NOT NULL,          -- matches a STARTER_TEMPLATES key, e.g. 'order_confirmed'
    template_name     TEXT NOT NULL,          -- exact name submitted to Meta (== key)
    category          TEXT NOT NULL CHECK (category IN ('UTILITY', 'MARKETING', 'AUTHENTICATION')),
    language          TEXT NOT NULL DEFAULT 'en',
    body_text         TEXT NOT NULL,
    variables         TEXT[] NOT NULL DEFAULT '{}',   -- e.g. ['customer_name','order_id','total'], positional order
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paused')),
    meta_template_id  TEXT,                   -- Meta's own id for this template, once created
    rejection_reason  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (business_id, key)
);

-- ============================================================
-- NOTIFICATIONS
-- In-app notifications shown from the dashboard's Topbar bell (e.g.
-- "your Order Confirmed template was approved").
-- ============================================================

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_business ON notifications(business_id, created_at DESC);

-- ============================================================
-- DRAFT ORDERS
-- ============================================================

CREATE TABLE draft_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'collecting'
                        CHECK (status IN ('collecting', 'completed', 'confirmed', 'cancelled', 'abandoned')),
    data            JSONB NOT NULL DEFAULT '{}',   -- the evolving Order Object
    missing_fields  TEXT[] NOT NULL DEFAULT '{}',  -- what's still needed — drives the next question
    order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,  -- linked once finalized
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- Index business_id on every tenant table — almost every query
-- filters by the current business. Also index the two hot paths
-- called on every inbound WhatsApp message.
-- ============================================================

-- users
CREATE INDEX idx_users_business ON users(business_id);

-- subscriptions
CREATE INDEX idx_subscriptions_business ON subscriptions(business_id);

-- payments
CREATE INDEX idx_payments_business ON payments(business_id);

-- categories
CREATE INDEX idx_categories_business ON categories(business_id);

-- products
CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_active ON products(business_id, is_active);

-- product_images
CREATE INDEX idx_product_images_product ON product_images(product_id);

-- product options and variants
CREATE INDEX idx_product_options_product_id ON product_options(product_id);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- customers
-- Combined index: used on every inbound webhook to look up the sender
CREATE INDEX idx_customers_business         ON customers(business_id);
CREATE INDEX idx_customers_number_business  ON customers(business_id, whatsapp_number);

-- customer_notes
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);

-- orders
-- Combined index: used by the dashboard pending orders view
CREATE INDEX idx_orders_business        ON orders(business_id);
CREATE INDEX idx_orders_status_business ON orders(business_id, status);
CREATE INDEX idx_orders_customer        ON orders(customer_id);

-- order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- whatsapp_message_logs
CREATE INDEX idx_wamessage_business  ON whatsapp_message_logs(business_id);
CREATE INDEX idx_wamessage_customer  ON whatsapp_message_logs(customer_id);
-- whatsapp_message_id already has a UNIQUE constraint which implicitly creates an index

-- ai_settings & faqs
CREATE INDEX idx_faqs_business ON faqs(business_id);

-- admin_logs
CREATE INDEX idx_admin_logs_admin    ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_business ON admin_logs(target_business_id);

-- feature_flags
CREATE UNIQUE INDEX idx_feature_flags_global_key
    ON feature_flags(key) WHERE business_id IS NULL;
CREATE UNIQUE INDEX idx_feature_flags_business_key
    ON feature_flags(key, business_id) WHERE business_id IS NOT NULL;
CREATE INDEX idx_feature_flags_business ON feature_flags(business_id);

-- interactive messages
CREATE INDEX idx_interactive_messages_business_id ON interactive_messages(business_id);

-- draft orders
CREATE INDEX idx_draft_orders_business_id ON draft_orders(business_id);
CREATE UNIQUE INDEX idx_draft_orders_active_per_customer
    ON draft_orders(customer_id) WHERE status = 'collecting';

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================
-- HOW THIS WORKS:
--   · auth.uid() = the UUID of the currently logged-in Supabase user.
--     We store that same UUID as users.id when we create the account,
--     so auth.uid() always maps to a row in the users table.
--
--   · The helper expression used in every policy:
--       (SELECT business_id FROM users WHERE id = auth.uid())
--     This resolves the current user's business_id in one indexed lookup.
--
--   · Exofe platform admins have users.business_id IS NULL + role = 'admin'.
--     Every policy grants them unrestricted access so they can manage
--     all businesses from the admin panel.
--
--   · The FastAPI backend connects using the Supabase SERVICE ROLE key,
--     which bypasses RLS entirely. RLS only applies to:
--       - Direct Supabase client calls from the frontend (if any)
--       - Any future mobile app connecting directly to Supabase
--     The backend itself enforces business_id scoping in every query.
--
--   · Every table gets one policy covering ALL operations (SELECT,
--     INSERT, UPDATE, DELETE). This keeps it simple for MVP — tighten
--     per-operation if you need staff-vs-owner permission differences later.
-- ============================================================

-- ── HELPER: is the current user a platform admin? ──────────────
-- We reference this check in every policy to grant admins full access.
-- Written inline rather than as a function to avoid function-creation
-- permissions issues on hosted Supabase.

-- ============================================================
-- ENABLE RLS ON EVERY TENANT TABLE
-- (marketing tables are intentionally left without RLS —
--  waitlist and demo_leads are public-facing inserts only)
-- ============================================================

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images         ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage               ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive_messages   ENABLE ROW LEVEL SECURITY; 

-- ============================================================
-- POLICIES
-- ============================================================

-- ── users ────────────────────────────────────────────────────
-- A user can see every other user who belongs to the same business.
-- Exofe admins (business_id IS NULL, role = 'admin') see all users.

CREATE POLICY "users: own business only"
    ON users FOR ALL
    USING (
        -- Admin bypass
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        -- Same business as the logged-in user
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
        OR
        -- A user can always see their own row (covers the case where
        -- business_id is resolved before the session is fully set up)
        id = auth.uid()
    );

-- ── businesses ───────────────────────────────────────────────
-- A user can only see (and update) their own business.
-- Admins see all businesses.

CREATE POLICY "businesses: own business only"
    ON businesses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── subscriptions ────────────────────────────────────────────

CREATE POLICY "subscriptions: own business only"
    ON subscriptions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── payments ─────────────────────────────────────────────────

CREATE POLICY "payments: own business only"
    ON payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── categories ───────────────────────────────────────────────

CREATE POLICY "categories: own business only"
    ON categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── products ─────────────────────────────────────────────────

CREATE POLICY "products: own business only"
    ON products FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "product_options: own business only"
    ON product_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        product_id IN (
            SELECT id FROM products
            WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
        )
    );
 
CREATE POLICY "product_variants: own business only"
    ON product_variants FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        product_id IN (
            SELECT id FROM products
            WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())
        )
    );
-- ── product_images ───────────────────────────────────────────
-- No direct business_id column — join through products.
-- This is a read-heavy table, so the join cost is acceptable.

CREATE POLICY "product_images: own business only"
    ON product_images FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        product_id IN (
            SELECT id FROM products
            WHERE business_id = (
                SELECT business_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- ── customers ────────────────────────────────────────────────

CREATE POLICY "customers: own business only"
    ON customers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── customer_notes ───────────────────────────────────────────
-- No direct business_id — join through customers.

CREATE POLICY "customer_notes: own business only"
    ON customer_notes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        customer_id IN (
            SELECT id FROM customers
            WHERE business_id = (
                SELECT business_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- ── orders ───────────────────────────────────────────────────

CREATE POLICY "orders: own business only"
    ON orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── order_items ──────────────────────────────────────────────
-- No direct business_id — join through orders.

CREATE POLICY "order_items: own business only"
    ON order_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        order_id IN (
            SELECT id FROM orders
            WHERE business_id = (
                SELECT business_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- ── whatsapp_message_logs ────────────────────────────────────

CREATE POLICY "whatsapp_message_logs: own business only"
    ON whatsapp_message_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── ai_settings ──────────────────────────────────────────────

CREATE POLICY "ai_settings: own business only"
    ON ai_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── ai_usage ─────────────────────────────────────────────────

CREATE POLICY "ai_usage: own business only"
    ON ai_usage FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── faqs ─────────────────────────────────────────────────────

CREATE POLICY "faqs: own business only"
    ON faqs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- ── admin_logs ───────────────────────────────────────────────
-- Only Exofe platform admins can read the audit log.
-- Business owners and staff have no access at all.

CREATE POLICY "admin_logs: admins only"
    ON admin_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
    );

-- ── feature_flags ────────────────────────────────────────────
-- A business can see:
--   (a) flags scoped to their specific business_id
--   (b) global flags (business_id IS NULL) — these apply to everyone
-- Admins see all flags.

CREATE POLICY "feature_flags: own business and global"
    ON feature_flags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        -- Their own business-specific flag
        business_id = (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
        OR
        -- Global flag visible to everyone
        business_id IS NULL
    );

-- ── interactive_messages ─────────────────────────────────────
-- Only the business that owns the interactive message can create or read it.

CREATE POLICY "interactive_messages: own business only"
    ON interactive_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    );
 
CREATE POLICY "draft_orders: own business only"
    ON draft_orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
              AND u.role = 'admin'
              AND u.business_id IS NULL
        )
        OR
        business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    );

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- To apply: uv run python -m app.database.init_db
-- To verify: check Supabase Table Editor → Authentication → Policies
-- ============================================================