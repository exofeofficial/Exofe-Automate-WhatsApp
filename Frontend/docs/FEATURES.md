# Features

This breaks down each MVP module from the PRD into what it actually needs to do. Use this alongside `API.md` and `DATABASE.md` when building each module.

## Authentication

- Register with first name, last name, email, password, country, and phone number
- Log in with email and password, or with a one time code sent to email
- Forgot password sends a reset link by email, the link expires after a reasonable window
- New accounts must verify their email before they can connect WhatsApp or take live orders
- Passwords are never stored in plain text

## Dashboard

- Today's orders: count and total value of orders placed today
- Pending orders: orders that need action, sorted by oldest first
- Revenue: total revenue, with a comparison to the previous period
- Analytics: a chart showing orders and revenue over a selectable date range
- Recent activity: a feed of the latest orders, messages, and status changes

## WhatsApp

- Connecting a number shows a QR code or a Meta verification flow, depending on how the business's number is set up
- Once connected, the dashboard shows connection status clearly, including if the connection drops
- Message logs show the full conversation history per customer, both what the customer sent and what the AI or a staff member replied
- AI replies are visually marked as AI generated in the log, so staff can tell which messages were automated

## Products

- Create, edit, and delete products
- Products belong to a category, categories are managed per business
- A product can have multiple images
- Stock count decreases automatically as orders are confirmed, and a product with zero stock is not offered by the AI until restocked
- Inactive products are hidden from the AI but not deleted, so history stays intact

## Orders

- Orders list shows status, customer, total, and payment method at a glance
- Status can be updated manually by staff, or automatically as the AI or a payment confirms things
- Search works by customer name, phone number, or order id
- Filters by status, date range, and payment method

## Customers

- Customer profile shows their order history and total amount spent
- Staff can add free text notes to a customer, useful for things like delivery instructions or complaints
- Customers are created automatically the first time they message the business on WhatsApp

## AI

- Business prompt: free text description of the business that grounds every AI reply, e.g. what the business sells and how it should talk about itself
- FAQs: a list of question and answer pairs the AI can pull from directly
- Tone: friendly, formal, or brief, changes how replies are phrased without changing what they say
- Greeting message: what a new conversation gets as its first reply
- See `AI.md` for how these settings feed into the actual response pipeline

## Billing

- Shows current plan, renewal date, and payment history
- Upgrading or downgrading a plan takes effect based on the billing provider's proration rules
- Failed payments should notify the business owner and give a grace period before restricting access

## Settings

- Business info: name, industry, logo, contact details
- Team members: invite staff by email, remove access when needed
- Delivery charges: a flat fee applied to orders, configurable per business
- Taxes: a percentage applied to orders, configurable per business

## Admin Panel

- Users: search and view any user across the platform
- Clients: view and manage business accounts, including suspending one if needed
- Subscriptions: see every active subscription and its status
- Revenue: platform wide revenue reporting, not scoped to one business
- Analytics: platform wide usage trends
- Logs: an audit trail of admin actions, who did what and when
- Support: a view for handling support requests from businesses
- Feature flags: turn features on or off, either globally or for a specific business, useful for gradual rollouts
