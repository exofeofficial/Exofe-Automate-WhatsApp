# API Reference

This is the full map of the backend API for the platform, organized by module. It covers more ground than `API_CONTRACT.md` at the root of the frontend project, which only lists the endpoints the marketing site and auth pages currently call. This file is meant to guide backend development for the whole product, including the parts the frontend has not been built for yet.

All endpoints are prefixed with `/api/v1` unless noted otherwise. All authenticated endpoints expect a `Authorization: Bearer <token>` header.

## Auth

| Method | Path | Description |
| --- | --- | --- |
| POST | /auth/signup | Create a business owner account |
| POST | /auth/login | Log in with email and password |
| POST | /auth/otp/request | Send a login code to an email |
| POST | /auth/otp/verify | Verify the code and log in |
| POST | /auth/forgot-password | Send a password reset link |
| POST | /auth/reset-password | Set a new password using a reset token |
| POST | /auth/verify-email | Confirm an email address using a verification token |
| POST | /auth/logout | Invalidate the current session |

## Dashboard

| Method | Path | Description |
| --- | --- | --- |
| GET | /dashboard/summary | Today's orders, pending orders, revenue, and recent activity in one call |
| GET | /dashboard/analytics | Time series data for charts, accepts a date range |

## WhatsApp

| Method | Path | Description |
| --- | --- | --- |
| POST | /whatsapp/connect | Start the connection flow, returns a QR code or setup link |
| GET | /whatsapp/status | Whether this business's WhatsApp is currently connected |
| POST | /whatsapp/disconnect | Disconnect the number |
| GET | /whatsapp/messages | Message log for a customer or across the business, paginated |
| POST | /whatsapp/webhook | Receives inbound messages from the WhatsApp Cloud API, not called by the frontend |

## Products

| Method | Path | Description |
| --- | --- | --- |
| GET | /products | List products, supports search and category filter |
| POST | /products | Create a product |
| GET | /products/{id} | Get one product |
| PATCH | /products/{id} | Update a product |
| DELETE | /products/{id} | Delete a product |
| POST | /products/{id}/images | Upload an image for a product |
| DELETE | /products/{id}/images/{image_id} | Remove a product image |
| GET | /categories | List categories |
| POST | /categories | Create a category |
| PATCH | /categories/{id} | Rename a category |
| DELETE | /categories/{id} | Delete a category |

## Orders

| Method | Path | Description |
| --- | --- | --- |
| GET | /orders | List orders, supports status filter, search, and date range |
| GET | /orders/{id} | Get one order with its items |
| PATCH | /orders/{id}/status | Update order status |
| POST | /orders | Create an order manually, used by staff for phone or walk in orders |

## Customers

| Method | Path | Description |
| --- | --- | --- |
| GET | /customers | List customers, supports search |
| GET | /customers/{id} | Get one customer, including order history and total spend |
| POST | /customers/{id}/notes | Add a note to a customer |
| GET | /customers/{id}/notes | List notes for a customer |

## AI

| Method | Path | Description |
| --- | --- | --- |
| GET | /ai/settings | Get current AI settings for the business |
| PATCH | /ai/settings | Update business prompt, tone, or greeting message |
| GET | /ai/faqs | List FAQs |
| POST | /ai/faqs | Add an FAQ |
| PATCH | /ai/faqs/{id} | Edit an FAQ |
| DELETE | /ai/faqs/{id} | Remove an FAQ |

See `AI.md` for how these settings actually affect AI behavior.

## Billing

| Method | Path | Description |
| --- | --- | --- |
| GET | /billing/subscription | Current plan and status |
| POST | /billing/subscribe | Start or change a subscription |
| POST | /billing/cancel | Cancel the current subscription |
| GET | /billing/payments | Payment history |

## Settings

| Method | Path | Description |
| --- | --- | --- |
| GET | /settings/business | Business profile info |
| PATCH | /settings/business | Update business info, delivery charge, tax rate |
| GET | /settings/team | List team members |
| POST | /settings/team | Invite a team member |
| DELETE | /settings/team/{id} | Remove a team member |

## Admin

These endpoints are only available to Exofe team accounts, not business owners or staff.

| Method | Path | Description |
| --- | --- | --- |
| GET | /admin/users | List all platform users |
| GET | /admin/clients | List all business accounts |
| GET | /admin/clients/{id} | Details for one business |
| PATCH | /admin/clients/{id}/status | Suspend or reactivate a business |
| GET | /admin/subscriptions | All active subscriptions across the platform |
| GET | /admin/revenue | Platform wide revenue reporting |
| GET | /admin/logs | Audit log of admin actions |
| GET | /admin/feature-flags | List feature flags |
| PATCH | /admin/feature-flags/{key} | Toggle a feature flag globally or per business |

## Marketing site endpoints

These are the ones already wired up in the frontend, listed in full detail in `API_CONTRACT.md`.

| Method | Path | Description |
| --- | --- | --- |
| POST | /waitlist | Join the early access waitlist from the homepage |
| POST | /demo/book | Book a free demo, does not create an account |

## Error format

Every error response follows the same shape across all endpoints.

```json
{
  "message": "Human readable summary",
  "errors": {
    "field_name": "Specific message for this field"
  }
}
```

`errors` is only present for 422 validation failures. Everything else just returns `message`.
