-- ============================================================
-- EXOFE — WhatsApp AI Order Bot
-- ============================================================
-- Design notes:
--   - Every tenant-scoped table carries shop_id directly (even
--     where it's technically derivable through a join) so Supabase
--     Row-Level Security policies can filter with a single indexed
--     column instead of nested subqueries.
--   - UUID primary keys (gen_random_uuid()) — safe to expose in
--     API responses, no sequential-ID enumeration risk.
--   - All money columns are NUMERIC(10,2), never float/varchar.
--   - Soft state via enums instead of booleans wherever there are
--     more than two real states.
-- ============================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type subscription_tier    as enum ('pilot', 'starter', 'growth');
create type subscription_status  as enum ('trialing', 'active', 'past_due', 'cancelled', 'expired');

create type conversation_state   as enum (
  'greeting', 'browsing_catalog', 'collecting_order',
  'confirming_order', 'awaiting_payment', 'completed',
  'handed_off', 'abandoned'
);

create type sender_type          as enum ('customer', 'bot', 'shop_owner', 'system');
create type message_type         as enum ('text', 'image', 'interactive', 'order', 'location', 'document');

create type cart_status          as enum ('active', 'converted', 'abandoned');

create type order_status         as enum (
  'pending', 'confirmed', 'preparing',
  'out_for_delivery', 'delivered', 'cancelled', 'refunded'
);
create type delivery_type        as enum ('delivery', 'pickup');

create type payment_payer        as enum ('shop', 'customer');       -- who is paying
create type payment_method       as enum ('cod', 'jazzcash', 'easypaisa', 'stripe', 'card');
create type payment_status       as enum ('pending', 'completed', 'failed', 'refunded');

-- ============================================================
-- SHOPS & AUTH
-- ============================================================

create table shops (
  shop_id                 uuid primary key default gen_random_uuid(),
  shop_name               varchar(150) not null,
  whatsapp_number         varchar(20) not null unique,
  whatsapp_phone_number_id varchar(50),          -- Meta Cloud API identifier, not the phone number itself
  business_category       varchar(80),
  timezone                varchar(50) default 'Asia/Karachi',
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Dashboard login for shop owners / staff
create table shop_owners (
  owner_id        uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references shops(shop_id) on delete cascade,
  full_name       varchar(150) not null,
  email           varchar(150) not null unique,
  password_hash   text not null,
  role            varchar(20) not null default 'owner',  -- owner | staff
  created_at      timestamptz not null default now()
);

-- Shop's subscription TO Exofe (platform billing — shop is the payer)
create table shop_subscriptions (
  subscription_id     uuid primary key default gen_random_uuid(),
  shop_id             uuid not null references shops(shop_id) on delete cascade,
  tier                subscription_tier not null,
  status              subscription_status not null default 'trialing',
  price_pkr           numeric(10,2) not null,
  billing_cycle_start date not null,
  billing_cycle_end   date not null,
  payment_method      payment_method,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- CATALOG
-- ============================================================

create table product_categories (
  category_id   uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references shops(shop_id) on delete cascade,
  name          varchar(100) not null,
  created_at    timestamptz not null default now(),
  unique (shop_id, name)
);

create table products (
  product_id       uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references shops(shop_id) on delete cascade,
  category_id      uuid references product_categories(category_id) on delete set null,
  name             varchar(150) not null,
  description      text,
  price            numeric(10,2) not null check (price >= 0),
  sku              varchar(50),
  image_url        text,
  is_available     boolean not null default true,
  stock_quantity   integer,                 -- null = untracked / unlimited stock
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

-- Customers are scoped per-shop: the same WhatsApp number messaging
-- two different shops is two separate customer records. This keeps
-- shop data fully isolated (important for RLS and for shops not
-- seeing each other's customer lists).
create table customers (
  customer_id       uuid primary key default gen_random_uuid(),
  shop_id           uuid not null references shops(shop_id) on delete cascade,
  name              varchar(150),
  whatsapp_number   varchar(20) not null,
  default_address   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (shop_id, whatsapp_number)
);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

-- Tracks WHERE the bot is in the conversation flow. This is what
-- lets the AI know "customer is mid-checkout" instead of re-greeting
-- them on every incoming message.
create table conversations (
  conversation_id     uuid primary key default gen_random_uuid(),
  shop_id             uuid not null references shops(shop_id) on delete cascade,
  customer_id         uuid not null references customers(customer_id) on delete cascade,
  state               conversation_state not null default 'greeting',
  handed_off_to_human boolean not null default false,
  last_message_at     timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create table messages (
  message_id            uuid primary key default gen_random_uuid(),
  conversation_id        uuid not null references conversations(conversation_id) on delete cascade,
  shop_id                 uuid not null references shops(shop_id) on delete cascade, -- denormalized for fast RLS filtering
  sender_type             sender_type not null,
  content                 text,
  message_type            message_type not null default 'text',
  whatsapp_message_id     varchar(100) unique,   -- Meta's message id — enforces webhook idempotency
  ai_metadata              jsonb,                  -- e.g. {"intent": "browse_catalog", "confidence": 0.92}
  created_at               timestamptz not null default now()
);

-- ============================================================
-- CART (pre-checkout state)
-- ============================================================

create table carts (
  cart_id          uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(conversation_id) on delete cascade,
  customer_id      uuid not null references customers(customer_id) on delete cascade,
  status           cart_status not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table cart_items (
  cart_item_id   uuid primary key default gen_random_uuid(),
  cart_id        uuid not null references carts(cart_id) on delete cascade,
  product_id     uuid not null references products(product_id),
  quantity       integer not null check (quantity > 0),
  unit_price     numeric(10,2) not null,   -- snapshot of product price at time of adding to cart
  created_at     timestamptz not null default now()
);

-- ============================================================
-- ORDERS
-- ============================================================

create table orders (
  order_id               uuid primary key default gen_random_uuid(),
  shop_id                uuid not null references shops(shop_id) on delete cascade,
  customer_id            uuid not null references customers(customer_id),
  conversation_id        uuid references conversations(conversation_id) on delete set null,
  order_number            varchar(20) not null,     -- human-friendly, e.g. shop-scoped sequence like "ORD-1024"
  status                   order_status not null default 'pending',
  delivery_type            delivery_type not null default 'delivery',
  delivery_address         text,
  subtotal                 numeric(10,2) not null,
  total_amount             numeric(10,2) not null,
  cancellable_until        timestamptz not null,     -- created_at + 5 minutes, enforced at application layer
  cancelled_at             timestamptz,
  cancellation_reason       text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (shop_id, order_number)
);

create table order_items (
  order_item_id      uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(order_id) on delete cascade,
  product_id         uuid references products(product_id),
  product_name_snapshot varchar(150) not null,   -- preserved even if product is later renamed/deleted
  unit_price          numeric(10,2) not null,
  quantity             integer not null check (quantity > 0),
  line_total            numeric(10,2) not null
);

-- Audit trail — useful for dashboard "order history" view and for
-- debugging disputed cancellations/refunds.
create table order_status_history (
  history_id     uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(order_id) on delete cascade,
  old_status     order_status,
  new_status     order_status not null,
  changed_by     varchar(20) not null default 'system', -- system | bot | shop_owner | customer
  changed_at     timestamptz not null default now()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
-- Single table handles BOTH payer directions (customer -> shop for
-- an order, and shop -> platform for a subscription), disambiguated
-- by `payer_type` and whichever FK is populated. Kept as one table
-- because transaction reconciliation logic (status, method,
-- transaction_id) is identical either way — but the two flows never
-- share rows, enforced by the check constraint below.

create table payments (
  payment_id       uuid primary key default gen_random_uuid(),
  payer_type       payment_payer not null,
  order_id         uuid references orders(order_id) on delete cascade,
  subscription_id  uuid references shop_subscriptions(subscription_id) on delete cascade,
  amount           numeric(10,2) not null,
  method           payment_method not null,
  status           payment_status not null default 'pending',
  transaction_id   varchar(100),
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  constraint payment_target_check check (
    (payer_type = 'customer' and order_id is not null and subscription_id is null) or
    (payer_type = 'shop'     and subscription_id is not null and order_id is null)
  )
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_products_shop           on products(shop_id);
create index idx_products_shop_available on products(shop_id, is_available);
create index idx_customers_shop          on customers(shop_id);
create index idx_conversations_shop      on conversations(shop_id);
create index idx_conversations_customer  on conversations(customer_id);
create index idx_conversations_state     on conversations(state);
create index idx_messages_conversation   on messages(conversation_id);
create index idx_messages_shop           on messages(shop_id);
create index idx_cart_items_cart         on cart_items(cart_id);
create index idx_orders_shop             on orders(shop_id);
create index idx_orders_customer         on orders(customer_id);
create index idx_orders_status           on orders(shop_id, status);
create index idx_order_items_order       on order_items(order_id);
create index idx_payments_order          on payments(order_id);
create index idx_payments_subscription   on payments(subscription_id);

-- ============================================================
-- ROW-LEVEL SECURITY (Supabase)
-- ============================================================
-- Every tenant table is locked to rows matching the logged-in
-- shop owner's shop_id. Assumes shop_owners.owner_id = auth.uid()
-- (i.e. the Supabase auth user ID is stored directly as owner_id
-- when the account is created).

alter table shops                enable row level security;
alter table products             enable row level security;
alter table product_categories   enable row level security;
alter table customers            enable row level security;
alter table conversations        enable row level security;
alter table messages             enable row level security;
alter table carts                enable row level security;
alter table cart_items           enable row level security;
alter table orders               enable row level security;
alter table order_items          enable row level security;
alter table order_status_history enable row level security;
alter table payments             enable row level security;
alter table shop_subscriptions   enable row level security;

-- Example policy pattern (repeat per table, swapping the table name):
create policy "Shop owners access their own shop data"
  on products for all
  using (
    shop_id in (select shop_id from shop_owners where owner_id = auth.uid())
  );

-- NOTE: the backend service (FastAPI) should connect using the
-- Supabase service_role key for bot-driven writes (webhook handler,
-- AI order parsing), which bypasses RLS entirely. RLS here protects
-- the dashboard's direct-to-Supabase reads/writes from the frontend.