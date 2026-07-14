// WhatsApp connection status, stored in localStorage since there is no
// backend yet. Backend developer: replace this whole file with a real
// fetch to GET /integrations/whatsapp/status, and the setters with the
// matching POST /integrations/whatsapp/connect and
// POST /integrations/whatsapp/disconnect calls. Keep the shape of
// WhatsAppStatus the same, the dashboard UI reads all of these fields.
//
// Webhook setup, this is what actually makes `webhookStatus` and
// `apiStatus` mean something real:
//
// 1. Once a business connects (either through embedded signup or the
//    manual form), register one webhook URL for the whole Exofe app,
//    not one per business, something like
//    https://api.exofe.com/webhooks/whatsapp. Meta sends every
//    connected business's events to this same URL, the payload
//    includes which phone_number_id it is for.
// 2. Meta calls this URL with a GET request first to verify it, echoing
//    back a `hub.challenge` value if your `hub.verify_token` matches
//    WHATSAPP_WEBHOOK_VERIFY_TOKEN (see DEPLOYMENT.md). This only
//    needs to happen once for the whole app, not per business.
// 3. After that, Meta POSTs events to the same URL. Verify the
//    `X-Hub-Signature-256` header on every request (HMAC SHA256 using
//    your Meta App Secret) before trusting the payload, otherwise
//    anyone who finds the URL could send fake messages or orders.
// 4. Subscribe to at least these webhook fields for the app:
//    `messages`, `statuses`, `message_template_status_update`, and
//    `account_update`. See DEPLOYMENT.md, "Comprehensive webhook event
//    handling" for what each one is for.
// 5. `webhookStatus` should flip to "unhealthy" if Meta reports
//    delivery failures for this business's events, or if the scheduled
//    health check (also in DEPLOYMENT.md) cannot reach the Graph API
//    with this business's stored access token.

const STORAGE_KEY = "exofe_whatsapp_status";

export type WhatsAppStatus = {
  connected: boolean;
  businessNumber: string | null;
  webhookStatus: "healthy" | "unhealthy";
  apiStatus: "connected" | "disconnected";
  aiStatus: "running" | "paused";
  lastSyncAt: string | null;
  messagesToday: number;
  ordersToday: number;
};

const DEFAULT_STATUS: WhatsAppStatus = {
  connected: false,
  businessNumber: null,
  webhookStatus: "unhealthy",
  apiStatus: "disconnected",
  aiStatus: "paused",
  lastSyncAt: null,
  messagesToday: 0,
  ordersToday: 0,
};

export function getWhatsAppStatus(): WhatsAppStatus {
  if (typeof window === "undefined") return DEFAULT_STATUS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATUS;
    return { ...DEFAULT_STATUS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATUS;
  }
}

export function setWhatsAppConnected(businessNumber: string) {
  const status: WhatsAppStatus = {
    connected: true,
    businessNumber,
    webhookStatus: "healthy",
    apiStatus: "connected",
    aiStatus: "running",
    lastSyncAt: new Date().toISOString(),
    messagesToday: 0,
    ordersToday: 0,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

export function setWhatsAppDisconnected() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATUS));
}
