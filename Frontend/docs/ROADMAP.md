# Roadmap

This is how we are sequencing the work, from what ships first to what comes later. Phases are grouped by dependency, not by fixed dates. A phase starts once the one before it is stable.

## Phase 1: MVP (Version 1.0)

The goal here is a working end to end loop: a business owner connects WhatsApp, sets up a catalog, and starts getting orders through AI.

- Authentication (login, register, forgot password, email verification)
- Dashboard (today's orders, pending orders, revenue, analytics, recent activity)
- WhatsApp connection (QR scan, message logs, AI replies)
- Products (CRUD, categories, images, prices, inventory)
- Orders (list, status update, search, filters)
- Customers (history, notes, spending)
- AI setup (business prompt, FAQs, tone, greeting messages)
- Billing (subscription, payment history, upgrade plan)
- Settings (business info, team members, delivery charges, taxes)
- Admin panel (users, clients, subscriptions, revenue, analytics, logs, support, feature flags)

This phase is considered done when a real business can run their WhatsApp orders through Exofe without needing us to manually intervene.

## Phase 2: Messaging channels

Once WhatsApp automation is proven, we extend the same AI pipeline to other channels businesses already use.

- Instagram DM
- Telegram

These reuse the same intent detection, product search, and order creation logic built for WhatsApp, just with a different message adapter per channel.

## Phase 3: Richer input types

- Image orders (customer sends a photo, AI matches it to a catalog item)
- Voice orders (customer sends a voice note, AI transcribes and processes it)
- AI recommendations (AI suggests related or higher value products during checkout)

## Phase 4: Integrations and South Korea expansion

- Shopify integration (sync catalog and orders both ways)
- WooCommerce integration
- KakaoTalk integration, tied to the South Korea market launch

## Phase 5: Scale

- Multi store support (one account managing several WhatsApp numbers or branches)
- Mobile app for business owners to manage orders on the go

## What is explicitly out of scope for now

- Anything outside Pakistan and South Korea
- Payment processing beyond what is needed for subscriptions and COD tracking
- Any channel not listed above
