# Product Requirements Document

## 1. Project Name

Exofe, an AI powered WhatsApp order automation platform.

## 2. Vision

Build a SaaS platform that automates WhatsApp orders for small and medium businesses using AI, reducing manual work and increasing sales.

## 3. Problem

Businesses currently:

- Reply manually on WhatsApp
- Lose customers due to slow responses
- Manage orders manually
- Cannot track analytics
- Have no centralized dashboard

## 4. Solution

Exofe provides:

- AI WhatsApp assistant
- Automated order taking
- Product catalog
- Order management
- Customer management
- Analytics dashboard
- Subscription based SaaS model

## 5. Target Users

- Clothing brands
- Restaurants
- Bakeries
- Gift shops
- Cosmetic stores
- Mobile shops
- Home businesses

Initial market is Pakistan. South Korea is the next market once the platform is stable.

## 6. User Roles

- Admin (Exofe team, manages the whole platform)
- Client (business owner who signs up and pays for a plan)
- Staff (employees added by a business owner to help manage orders)

## 7. MVP Features

### Authentication

- Login
- Register
- Forgot password
- Email verification

### Dashboard

- Today's orders
- Pending orders
- Revenue
- Analytics
- Recent activity

### WhatsApp

- Connect WhatsApp
- QR scan
- Message logs
- AI replies

### Products

- CRUD products
- Categories
- Images
- Prices
- Inventory

### Orders

- Order list
- Status update
- Search
- Filters

### Customers

- Customer history
- Notes
- Spending

### AI

- Business prompt
- FAQs
- AI tone
- Greeting messages

### Billing

- Subscription
- Payment history
- Upgrade plan

### Settings

- Business info
- Team members
- Delivery charges
- Taxes

## 8. Admin Panel

- Users
- Clients
- Subscriptions
- Revenue
- Analytics
- Logs
- Support
- Feature flags

## 9. Tech Stack

**Frontend**

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion

**Backend**

- Python
- FastAPI

**Database**

- PostgreSQL

**Cache**

- Redis

**Queue**

- Celery with Redis as the broker

**Authentication**

- JWT

**Storage**

- Cloudflare R2

**Deployment**

- Docker
- VPS

## 10. AI

- Intent detection
- Product search
- Order creation
- FAQ answers
- Human handover

See `AI.md` for the full breakdown of how this pipeline works.

## 11. Subscription Plans

- Starter
- Growth
- Business

## 12. Future Roadmap

- Voice orders
- Image orders
- AI recommendations
- Shopify integration
- WooCommerce integration
- KakaoTalk integration
- Instagram DM
- Telegram
- Multi store support
- Mobile app

See `ROADMAP.md` for how these are sequenced.

## 13. Success Metrics

- Paying customers
- Monthly recurring revenue (MRR)
- Daily active businesses
- AI response accuracy
- Customer retention
- Churn rate

## 14. Version

Version 1.0, the MVP.
