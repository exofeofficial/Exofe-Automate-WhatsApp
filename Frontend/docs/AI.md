# AI System

This describes how the AI assistant is expected to behave when a customer messages a business on WhatsApp. It is meant to guide how the AI pipeline gets built on the backend, and how the settings in `ai_settings` and `faqs` (see `DATABASE.md`) get used.

## Pipeline overview

Every inbound WhatsApp message goes through the same sequence of steps before a reply is sent back.

```
Inbound message
      │
      ▼
Intent detection
      │
      ├── Greeting ─────────▶ Send greeting_message
      │
      ├── FAQ ──────────────▶ Search faqs, answer directly
      │
      ├── Order intent ─────▶ Product search ─▶ Order creation flow
      │
      └── Unclear / low confidence ─▶ Human handover
```

## Intent detection

The first thing the AI does with an inbound message is classify what the customer wants. At minimum it needs to distinguish between:

- A greeting or small talk
- A question that matches something in the business's FAQs
- An attempt to order something (asking about a product, price, or stock)
- Something the AI is not confident about

Confidence matters more than coverage here. It is better for the AI to hand off a message it is unsure about than to guess and give a customer wrong information about price or stock.

## Product search

When the intent looks like an order, the AI needs to match what the customer said to an actual product in that business's catalog. This should search product name and description, and only consider products where `is_active` is true and stock is available.

If nothing matches with reasonable confidence, the AI should ask a clarifying question rather than guessing, for example asking the customer to confirm which item they mean if there are multiple close matches.

## Order creation

Once a product is identified, the AI walks the customer through the rest of the order in a natural conversation rather than a rigid form:

1. Confirm the product and quantity
2. Ask for a delivery address if the business needs one
3. Ask for a payment method from what the business has enabled (cash on delivery, JazzCash, Easypaisa, or Stripe depending on the business's country)
4. Summarize the order and confirm before creating it

The order is only written to the `orders` table once the customer confirms. Partial or abandoned conversations should not create an order.

## FAQ answers

FAQs are simple question and answer pairs a business owner writes themselves. When the AI matches a customer question to one, it should use the business owner's answer as written rather than rephrasing it heavily, since the business owner may have worded it carefully for legal or brand reasons (return policy, for example).

## Human handover

Handover means the AI stops replying and a real staff member takes over the conversation. This should happen when:

- The AI's confidence is low on what the customer wants
- The customer explicitly asks to speak to a person
- The conversation involves a complaint or a refund request
- `handover_enabled` is turned off entirely for that business, in which case every message goes to a human by default and the AI only assists with suggested replies

When handover happens, the business's dashboard should clearly flag the conversation as needing attention, not just silently stop responding.

## Business prompt and tone

The `business_prompt` field is free text the business owner writes describing their business. This should be included as context on every AI call so replies sound like they are coming from that specific business rather than a generic assistant.

`tone` changes phrasing without changing the underlying facts:

- Friendly: casual, uses emojis sparingly, warmer language
- Formal: professional, no emojis, complete sentences
- Brief: short replies, minimal small talk, gets to the point fast

## What the AI should never do

- Never invent a price, product, or stock level that is not in the business's actual catalog
- Never confirm an order without the customer explicitly agreeing to it
- Never claim to be a human when directly asked if it is a bot
- Never proceed with a payment method the business has not enabled

## Accuracy tracking

AI response accuracy is one of the platform's success metrics (see `PRD.md`). This means every AI reply should be logged with enough context (which intent it detected, which product it matched, whether it got handed over) so accuracy can be measured after the fact, not just assumed.
