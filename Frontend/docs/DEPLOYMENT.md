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
