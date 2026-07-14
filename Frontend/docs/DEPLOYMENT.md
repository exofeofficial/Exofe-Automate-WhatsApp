# Deployment

Both frontend and backend run as Docker containers, deployed to a VPS. This document covers the environment variables, container setup, and the general deployment flow.

## Environment variables

### Frontend

| Variable | Description |
| --- | --- |
| NEXT_PUBLIC_API_URL | Base URL of the backend API, e.g. https://api.exofe.com |

Set in `.env.local` for local development, see `.env.example`. On the server, this is set through the deployment environment, not committed to the repo.

### Backend (expected)

| Variable | Description |
| --- | --- |
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string, used for both cache and Celery broker |
| JWT_SECRET | Signing secret for auth tokens |
| WHATSAPP_CLOUD_API_TOKEN | Token for the Meta WhatsApp Cloud API |
| WHATSAPP_WEBHOOK_VERIFY_TOKEN | Verification token Meta uses when confirming the webhook |
| R2_ACCESS_KEY_ID | Cloudflare R2 credentials |
| R2_SECRET_ACCESS_KEY | Cloudflare R2 credentials |
| R2_BUCKET_NAME | Cloudflare R2 bucket for product images and logos |

None of these should ever be committed to the repository. Use a `.env` file on the server that is excluded from git, the same pattern the frontend already follows.

## Docker setup

Each part of the platform runs as its own container:

- `frontend`, the Next.js app, built and served with `next start`
- `backend`, the FastAPI app, served with something like Uvicorn or Gunicorn
- `postgres`, the database
- `redis`, cache and Celery broker
- `worker`, a Celery worker process running the same backend image but a different start command

A `docker-compose.yml` at the repository root should define all five services, with `frontend` and `backend` depending on `postgres` and `redis` being healthy before they start.

## Reverse proxy

Nginx sits in front of both containers, routing `exofe.com` to the frontend container and `api.exofe.com` to the backend container. SSL is handled at this layer, using Let's Encrypt for certificates.

## Deployment flow

1. Push to the branch that triggers deployment
2. Build both Docker images
3. Run database migrations against the production database before swapping containers
4. Start the new containers, stop the old ones once the new ones report healthy
5. Nginx picks up the new containers automatically since it points at the service name, not a fixed container id

## CI/CD

GitHub Actions is a reasonable starting point given the code is already on GitHub. A workflow that runs on push to the main branch should:

- Run the frontend's lint and build step to catch broken builds before they reach the server
- Run backend tests once they exist
- SSH into the VPS and pull the latest images, or trigger a webhook the server listens for

This does not need to be complex for the MVP stage, a simple deploy script triggered manually is fine until the team is pushing often enough that automation pays for itself.

## Backups

PostgreSQL should have automated daily backups, kept for at least 30 days. Since this is a shared multi tenant database, losing it means losing every business's data at once, so this is not optional even at the MVP stage.

## Monitoring

At minimum, track:

- Uptime for both the frontend and backend containers
- Error rate on the backend, especially on the WhatsApp webhook endpoint since that is the core of the product
- Celery queue length, a growing queue means messages are not being processed fast enough

A simple uptime checker plus application logs is enough to start, a full observability stack can come later once there is real traffic to monitor.

## WhatsApp integration, production checklist

The frontend's Connect WhatsApp flow (see FEATURES.md) is built and working against mock data. Everything below is what turns it into a real, multi tenant integration instead of a demo.

### Meta setup, one time

- A Business type app on Meta for Developers, with the WhatsApp product added
- An Embedded Signup config created under App, WhatsApp, Embedded Signup. This gives you the `config_id` the frontend's `FB.login()` call needs
- Request `whatsapp_business_management`, `whatsapp_business_messaging`, and `business_management` permissions, then submit for App Review to get Advanced Access. Until this is approved, only your own test numbers can connect, not real businesses. Start this early, review can take days
- Business verification inside Meta Business Manager. Without it, messaging limits stay very low, around 250 conversations a day
- A Privacy Policy URL and a Data Deletion Callback URL registered in the app settings, Meta requires both before review

### Multi tenant architecture

- Every WhatsApp connection, meaning the WABA ID, phone number ID, and access token, belongs to exactly one business in the database. Never share a connection across tenants
- Incoming webhook payloads carry the phone number ID, use that to look up which business the message belongs to before doing anything else with it
- Messaging limits and quality ratings are per WABA, so track usage per tenant. One business sending a lot of messages should never affect another business's limits or show up in their numbers

### Queue based processing

- The webhook endpoint should do only two things: verify the signature, then push the raw payload onto a queue and return 200 right away. Meta expects a fast response and will slow down or stop sending if the endpoint is slow
- Outgoing messages go through a queue too, so a slow Graph API call never blocks a request a user is waiting on, like sending an order confirmation

### Background workers

- Celery workers, the `worker` service already in docker-compose, consume both the incoming and outgoing queues
- Keep incoming and outgoing on separate queues, or at least separate priorities. A backlog of outgoing messages should never delay an incoming customer message from reaching the AI
- Failed sends should retry with backoff, then get marked as failed after a fixed number of attempts. Do not retry forever

### Comprehensive webhook event handling

Subscribe to more than just incoming messages, each of these needs its own handler:

- `messages`, incoming customer messages
- `statuses`, delivery, read, and failed receipts for messages Exofe sent
- `message_template_status_update`, fires when Meta approves or rejects a message template
- `account_update` and account alerts, warns when a WABA gets restricted or flagged, this should immediately mark the tenant's connection as needing attention

### Secret management

- Per tenant access tokens should live encrypted in the database, application level encryption, not just relying on disk or volume encryption
- The Meta App Secret and the platform level `WHATSAPP_WEBHOOK_VERIFY_TOKEN` are shared across all of Exofe, separate from each tenant's own access token, do not mix these up
- Use a secrets manager for platform level secrets, AWS Secrets Manager, HashiCorp Vault, or a simpler self hosted option like Infisical, rather than raw values sitting in a `.env` file long term
- Support rotating the App Secret without downtime by accepting two valid secrets during the rotation window

### Automated reconnect and health checks

- Access tokens can expire or get revoked, a business owner can remove Exofe's access from their end, or a WABA can get restricted. Run a scheduled job that checks each connected tenant's token against the Graph API
- If a check fails, mark that tenant as disconnected in the database right away, that is what drives the "Your WhatsApp connection has expired" banner on the Integrations page
- Try a silent token refresh first if Meta allows it for the flow being used, only show the reconnect banner to the business owner once a silent refresh is not possible
