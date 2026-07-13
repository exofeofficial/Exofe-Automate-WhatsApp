# Architecture

## Overview

Exofe is a multi tenant SaaS platform. One deployment serves every business that signs up, and their data is kept separate at the database level using a `business_id` on every table, rather than giving each client a separate database or server.

```
                     ┌─────────────────────┐
                     │   WhatsApp Cloud API │
                     └──────────┬───────────┘
                                │ webhook
                                ▼
┌────────────┐        ┌──────────────────┐        ┌─────────────┐
│  Next.js    │  HTTP  │     FastAPI       │        │ PostgreSQL  │
│  Frontend   │───────▶│     Backend       │───────▶│  Database   │
└────────────┘        └────────┬─────────┘        └─────────────┘
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
              ┌─────────────┐       ┌─────────────┐
              │    Redis     │       │  Cloudflare  │
              │ cache/queue  │       │      R2      │
              └──────┬───────┘       └─────────────┘
                     │
                     ▼
              ┌─────────────┐
              │    Celery    │
              │   workers    │
              └─────────────┘
```

## Frontend

Built with Next.js and TypeScript, styled with Tailwind CSS and shadcn/ui, animated with Framer Motion and GSAP. The frontend is a client of the API, it holds no business logic of its own beyond form validation and presentation.

The marketing site (landing page, signup, login, demo booking, documentation) is public and does not require authentication. The dashboard, once built, will sit behind a login and talk to the same backend using the JWT issued at login.

## Backend

Built with Python and FastAPI. Organized around the modules listed in `API.md`: auth, dashboard, WhatsApp, products, orders, customers, AI, billing, settings, and admin. Each module is a router with its own set of endpoints, sharing a common authentication dependency that resolves the current user and their business.

## Database

PostgreSQL, one shared database for all tenants. Every table that belongs to a business carries a `business_id` foreign key, and every query is expected to filter by it. See `DATABASE.md` for the full schema.

Whether this runs self-hosted on the VPS or on a managed platform like Supabase or Neon is up to the backend team, this diagram just shows it as one box.

## Cache and queue

Redis serves two purposes. It is used as a cache for things like dashboard summaries that do not need to be recalculated on every request, and it is the broker for Celery, which handles background jobs.

Background jobs are used for anything that should not block a request, such as:

- Processing an inbound WhatsApp message through the AI pipeline
- Sending confirmation emails
- Generating analytics for the dashboard

## Authentication

JWT based. On login, the backend issues a token that the frontend stores and sends as a bearer token on every authenticated request. Tokens carry the user id, business id, and role, so the backend can authorize a request without an extra database lookup on every call.

## File storage

Product images and business logos are stored in Cloudflare R2, not on the application server. The backend generates a signed upload URL, the frontend uploads directly to R2, and only the resulting URL is saved in the database.

## WhatsApp integration

Exofe connects through the official WhatsApp Cloud API, not an unofficial bridge. This keeps a business's number safe from being banned. Inbound messages arrive at a webhook endpoint on the backend, get queued for AI processing, and the AI's reply is sent back out through the same Cloud API.

## Deployment

Both frontend and backend run in Docker containers, deployed to a VPS. PostgreSQL and Redis also run as containers on the same infrastructure for the MVP stage. See `DEPLOYMENT.md` for the full setup.

## Multi tenancy

There is one instance of the application serving every business. Isolation between businesses happens entirely through the `business_id` scoping at the database and API layer, not through separate infrastructure. This keeps hosting costs low while the platform is small, and is the standard approach for SaaS products at this stage.
