import type {
  InteractiveButton,
  InteractiveListRow,
  InteractiveMessageKind,
  InteractiveMessageTemplate,
  InteractiveMessageTrigger,
} from "@/lib/api";

// The MVP variable catalog. Backend developer: when an order is created,
// build an object with these exact keys (see the sample values below for
// the shape) and run the saved bodyText through a {{key}} replace before
// calling the WhatsApp Cloud API. The business owner never sees this key
// list as "variables to remember", they just click them from the panel.
export const VARIABLE_GROUPS: { group: string; variables: { key: string; label: string }[] }[] = [
  {
    group: "Customer",
    variables: [
      { key: "customer_name", label: "Customer Name" },
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "phone", label: "Phone" },
    ],
  },
  {
    group: "Order",
    variables: [
      { key: "order_id", label: "Order ID" },
      { key: "order_number", label: "Order Number" },
      { key: "order_total", label: "Order Total" },
      { key: "currency", label: "Currency" },
      { key: "order_date", label: "Order Date" },
      { key: "payment_method", label: "Payment Method" },
    ],
  },
  {
    group: "Products",
    variables: [
      { key: "product_name", label: "Product Name" },
      { key: "product_sku", label: "Product SKU" },
      { key: "quantity", label: "Quantity" },
      { key: "variant", label: "Variant" },
      { key: "category", label: "Category" },
    ],
  },
  {
    group: "Shipping",
    variables: [
      { key: "delivery_address", label: "Delivery Address" },
      { key: "city", label: "City" },
      { key: "tracking_number", label: "Tracking Number" },
    ],
  },
  {
    group: "Business",
    variables: [
      { key: "store_name", label: "Store Name" },
      { key: "support_number", label: "Support Number" },
      { key: "website", label: "Website" },
    ],
  },
];

// Sample values used only to render the preview bubble, so the business
// owner sees "Hello Umer" instead of "Hello {{customer_name}}". The saved
// bodyText always keeps the raw {{key}} tokens, this never gets written
// back to the message itself.
const SAMPLE_VALUES: Record<string, string> = {
  customer_name: "Umer Akhlaq",
  first_name: "Umer",
  last_name: "Akhlaq",
  phone: "+92 300 1234567",
  order_id: "ORD-10234",
  order_number: "10234",
  order_total: "7,999",
  currency: "Rs. ",
  order_date: "July 13, 2026",
  payment_method: "Cash on Delivery",
  product_name: "Air Buds Pro",
  product_sku: "ABP-001",
  quantity: "2",
  variant: "Black",
  category: "Electronics",
  delivery_address: "House 12, Gulberg III",
  city: "Lahore",
  tracking_number: "TRK-88213",
  store_name: "Exofe",
  support_number: "+92 300 9998888",
  website: "exofe.com",
};

export function renderPreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => SAMPLE_VALUES[key] ?? match);
}

export const TEMPLATE_META: Record<
  InteractiveMessageTemplate,
  { label: string; hint: string; defaultBody: string; defaultButtons: string[] }
> = {
  order_confirmation: {
    label: "Order Confirmation",
    hint: "Sent right after a customer places an order",
    defaultBody:
      "Hello {{customer_name}} 👋\n\nThank you for shopping with {{store_name}}.\n\nWe have received your order.\n\nOrder ID: {{order_id}}\nTotal: {{currency}}{{order_total}}\n\nPlease confirm your order below.",
    defaultButtons: ["Confirm Order", "Edit Order", "Cancel"],
  },
  payment_reminder: {
    label: "Payment Reminder",
    hint: "Nudge a customer who hasn't paid yet",
    defaultBody: "Hello {{first_name}}, your payment of {{currency}}{{order_total}} for order {{order_id}} is still pending.",
    defaultButtons: ["Pay Now", "View Invoice"],
  },
  delivery_update: {
    label: "Delivery Update",
    hint: "Let a customer know their order is on the way",
    defaultBody: "Hi {{first_name}}, your order {{order_id}} is on its way! Tracking number: {{tracking_number}}",
    defaultButtons: ["Track Order", "Contact Support"],
  },
  welcome_message: {
    label: "Welcome Message",
    hint: "Greet a new customer the first time they message you",
    defaultBody: "Hello {{first_name}} 👋 Welcome to {{store_name}}! How can we help today?",
    defaultButtons: ["Browse Products", "Talk to Us"],
  },
  custom: {
    label: "Custom Message",
    hint: "Start from a blank message",
    defaultBody: "",
    defaultButtons: ["Yes", "No"],
  },
};

export const TRIGGER_META: Record<InteractiveMessageTrigger, { label: string; description: string }> = {
  after_order_created: { label: "After AI creates an order", description: "Sent the moment the AI assistant logs a new order" },
  after_payment: { label: "After payment", description: "Sent once a payment comes through" },
  after_shipping: { label: "After shipping", description: "Sent when the order is marked as shipped" },
  manual: { label: "Manually", description: "You send it yourself from a conversation" },
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Stand-in for a real AI call. Backend developer: this whole function
// should become a POST /automation/interactive-messages/generate request
// that hands the prompt to an LLM and gets back the same shape, including
// the {{variable}} tokens in bodyText. Keeping the shape identical means
// the wizard UI doesn't need to change later.
export function generateFromPrompt(prompt: string): {
  template: InteractiveMessageTemplate;
  bodyText: string;
  kind: InteractiveMessageKind;
  buttons: InteractiveButton[];
  listButtonLabel: string;
  listRows: InteractiveListRow[];
  trigger: InteractiveMessageTrigger;
} {
  const p = prompt.toLowerCase();

  let template: InteractiveMessageTemplate = "custom";
  if (p.includes("order") && (p.includes("confirm") || p.includes("thank"))) template = "order_confirmation";
  else if (p.includes("pay")) template = "payment_reminder";
  else if (p.includes("deliver") || p.includes("ship") || p.includes("track")) template = "delivery_update";
  else if (p.includes("welcome") || p.includes("greet")) template = "welcome_message";

  let trigger: InteractiveMessageTrigger = "manual";
  if (p.includes("after") && p.includes("order")) trigger = "after_order_created";
  else if (p.includes("after") && p.includes("pay")) trigger = "after_payment";
  else if (p.includes("after") && (p.includes("ship") || p.includes("deliver"))) trigger = "after_shipping";
  else if (template === "order_confirmation") trigger = "after_order_created";
  else if (template === "payment_reminder") trigger = "after_payment";
  else if (template === "delivery_update") trigger = "after_shipping";

  const meta = TEMPLATE_META[template];
  let bodyText = meta.defaultBody;
  // A couple of light touches so the generated message reflects specific
  // things the prompt asked for, without needing a real model yet.
  if (p.includes("phone") && !bodyText.includes("{{phone}}")) bodyText += "\n\nWe'll reach you at {{phone}} if needed.";
  if (p.includes("track") && !bodyText.includes("{{tracking_number}}")) {
    bodyText += "\n\nTracking number: {{tracking_number}}";
  }

  const buttonLabels = [...meta.defaultButtons];
  if (p.includes("track") && !buttonLabels.some((b) => b.toLowerCase().includes("track"))) {
    buttonLabels.push("Track Order");
  }

  return {
    template,
    bodyText,
    kind: "buttons",
    buttons: buttonLabels.slice(0, 3).map((text) => ({ id: newId(), text })),
    listButtonLabel: "View Options",
    listRows: buttonLabels.slice(0, 3).map((text) => ({ id: newId(), title: text })),
    trigger,
  };
}

export function makeButton(text: string): InteractiveButton {
  return { id: newId(), text };
}

export function makeListRow(title: string): InteractiveListRow {
  return { id: newId(), title };
}
