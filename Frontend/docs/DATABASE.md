# Database Design

Database is PostgreSQL. This document describes the core tables needed for the MVP. Column types are written in plain terms (text, number, boolean, timestamp) rather than exact PostgreSQL types, since the backend team can pick the right precision (varchar length, numeric precision, etc).

Hosting is not fixed here, self-hosted Postgres on the VPS, or a managed option like Supabase or Neon, are all fine. That call belongs to whoever builds the backend, this document only covers the schema.

Every table that belongs to a business includes a `business_id` column. This is how we keep one client's data separate from another's on a shared database, instead of giving each client their own database.

## users

The people who can log into Exofe. This covers both business owners and their staff.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | which business this user belongs to, null for Exofe admins |
| role | text | admin, owner, or staff |
| first_name | text | |
| last_name | text | |
| email | text | unique |
| password_hash | text | |
| phone | text | |
| country_code | text | PK, KR, or AE |
| email_verified_at | timestamp | null until verified |
| created_at | timestamp | |
| updated_at | timestamp | |

## businesses

One row per client account. This is the tenant.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| owner_id | uuid | references users.id |
| name | text | |
| industry | text | clothing, restaurant, bakery, gift shop, cosmetics, mobile shop, home business |
| logo_url | text | stored in Cloudflare R2 |
| whatsapp_number | text | null until connected |
| whatsapp_connected_at | timestamp | null until connected |
| delivery_charge | number | flat fee, per business |
| tax_rate | number | percentage |
| created_at | timestamp | |
| updated_at | timestamp | |

## subscriptions

Tracks which plan a business is on.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| plan | text | starter, growth, business |
| status | text | active, past_due, canceled |
| current_period_end | timestamp | |
| created_at | timestamp | |

## payments

Payment history for subscriptions.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| subscription_id | uuid | |
| amount | number | |
| currency | text | PKR, KRW, AED |
| status | text | succeeded, failed, refunded |
| paid_at | timestamp | |

## categories

Product categories, scoped per business.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| name | text | |
| created_at | timestamp | |

## products

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| category_id | uuid | nullable |
| name | text | |
| description | text | |
| price | number | |
| stock | number | -1 means unlimited |
| is_active | boolean | inactive products are not offered by the AI |
| created_at | timestamp | |
| updated_at | timestamp | |

## product_images

A product can have more than one image.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| product_id | uuid | |
| url | text | stored in Cloudflare R2 |
| sort_order | number | |

## customers

A customer belongs to a business, identified by their WhatsApp number. Not the same as a `users` row, customers never log in.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| whatsapp_number | text | |
| name | text | pulled from WhatsApp profile if available |
| total_spent | number | running total, updated when orders complete |
| created_at | timestamp | first time this customer messaged |

## customer_notes

Free text notes staff can add to a customer.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| customer_id | uuid | |
| author_id | uuid | references users.id |
| note | text | |
| created_at | timestamp | |

## orders

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| customer_id | uuid | |
| status | text | new, confirmed, shipped, delivered, canceled |
| payment_method | text | cod, jazzcash, easypaisa, stripe |
| subtotal | number | |
| delivery_charge | number | |
| tax | number | |
| total | number | |
| delivery_address | text | |
| created_by | text | ai or a specific user id, tracks who took the order |
| created_at | timestamp | |
| updated_at | timestamp | |

## order_items

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| order_id | uuid | |
| product_id | uuid | |
| quantity | number | |
| unit_price | number | snapshot of the price at order time, does not change if the product price changes later |

## whatsapp_message_logs

Every inbound and outbound message, kept for debugging and for showing message logs in the dashboard.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| customer_id | uuid | |
| direction | text | inbound or outbound |
| message_type | text | text, image, voice |
| content | text | the message body, or a reference to stored media |
| ai_generated | boolean | true if this outbound message came from the AI |
| created_at | timestamp | |

## ai_settings

One row per business, holds everything that shapes how the AI talks for that business.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | unique, one settings row per business |
| business_prompt | text | free text description of the business, used as context for the AI |
| tone | text | friendly, formal, or brief |
| greeting_message | text | first message sent to a new conversation |
| handover_enabled | boolean | whether the AI can hand off to a human |
| updated_at | timestamp | |

## faqs

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| business_id | uuid | |
| question | text | |
| answer | text | |
| created_at | timestamp | |

## admin_logs

Audit trail for actions taken in the admin panel.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| admin_id | uuid | references users.id |
| action | text | e.g. "suspended business", "changed plan" |
| target_business_id | uuid | nullable |
| created_at | timestamp | |

## feature_flags

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid | primary key |
| key | text | unique, e.g. "voice_orders" |
| enabled | boolean | |
| business_id | uuid | nullable, if set the flag only applies to one business |

## Relationships summary

- One business has many users (staff), one products, many categories, many customers, many orders, one ai_settings, many faqs, and one subscription
- One order has many order_items, each pointing to a product
- One customer has many orders and many customer_notes
- One product has many product_images and belongs to one category

## Indexing notes

- Index `business_id` on every table that has it, since almost every query filters by the current business
- Index `customers.whatsapp_number` combined with `business_id`, this is the lookup used every time a WhatsApp message comes in
- Index `orders.status` combined with `business_id` for the dashboard's pending orders view
