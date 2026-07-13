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
    password_hash       TEXT NOT NULL,
    phone               TEXT,
    country_code        TEXT                           -- 'PK' | 'KR' | 'AE'
                            CHECK (country_code IN ('PK', 'KR', 'AE')),
    email_verified_at   TIMESTAMPTZ,                   -- NULL until email is confirmed
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUSINESSES
-- One row per client account — the tenant anchor.
-- Every other tenant table references business_id → businesses.id
-- ============================================================

CREATE TABLE businesses (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES users(id),
    name                    TEXT NOT NULL,
    industry                TEXT                   -- clothing | restaurant | bakery |
                                                   -- gift shop | cosmetics | mobile shop | home business
                                CHECK (industry IN (
                                    'clothing', 'restaurant', 'bakery',
                                    'gift shop', 'cosmetics', 'mobile shop', 'home business'
                                )),
    logo_url                TEXT,                  -- stored in Cloudflare R2
    whatsapp_number         TEXT,                  -- NULL until connected
    whatsapp_connected_at   TIMESTAMPTZ,           -- NULL until first successful connection
    delivery_charge         NUMERIC(10,2) NOT NULL DEFAULT 0,   -- flat fee per order
    tax_rate                NUMERIC(5,2) NOT NULL DEFAULT 0,    -- percentage (e.g. 17.00 = 17%)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now that businesses exists, add the FK from users.business_id
ALTER TABLE users
    ADD CONSTRAINT fk_users_business
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- ============================================================
-- SUBSCRIPTIONS
-- Tracks which Exofe plan a business is on.
-- ============================================================

CREATE TABLE subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    plan                TEXT NOT NULL
                            CHECK (plan IN ('starter', 'growth', 'business')),
    status              TEXT NOT NULL
                            CHECK (status IN ('active', 'past_due', 'canceled')),
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
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name        TEXT NOT NULL,
    description TEXT,
    price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock       INTEGER NOT NULL DEFAULT -1,   -- -1 = unlimited / untracked
    is_active   BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE = hidden from AI, history preserved
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- CUSTOMERS
-- WhatsApp end-customers. They never log in to Exofe.
-- A customer belongs to one business — the same WhatsApp number
-- messaging two different businesses is two separate rows.
-- ============================================================

CREATE TABLE customers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    whatsapp_number  TEXT NOT NULL,
    name             TEXT,           -- pulled from WhatsApp profile if available
    total_spent      NUMERIC(10,2) NOT NULL DEFAULT 0,  -- running total, updated on order completion
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
                         CHECK (payment_method IN ('cod', 'jazzcash', 'easypaisa', 'stripe')),
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
    product_id  UUID NOT NULL REFERENCES products(id),
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
    key         TEXT NOT NULL UNIQUE,   -- e.g. 'voice_orders', 'instagram_dm'
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
CREATE INDEX idx_products_business   ON products(business_id);
CREATE INDEX idx_products_active     ON products(business_id, is_active);  -- AI catalog query

-- product_images
CREATE INDEX idx_product_images_product ON product_images(product_id);

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
CREATE INDEX idx_feature_flags_business ON feature_flags(business_id);

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
ALTER TABLE faqs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags          ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- To apply: uv run python -m app.database.init_db
-- To verify: check Supabase Table Editor → Authentication → Policies
-- ============================================================