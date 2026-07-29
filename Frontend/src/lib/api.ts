import { getToken } from "@/lib/auth";
import { getAdminToken } from "@/lib/adminAuth";
import type { TrialStatus } from "@/lib/trial";

// Single place every fetch call to the backend goes through.
// Swap NEXT_PUBLIC_API_URL in .env.local once the real API is up nothing
// else in the frontend needs to change.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  // per-field validation errors, e.g. { email: "already in use" } — 422 responses
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    // backend can send { message: "..." } on errors; falls back to status text
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? res.statusText, res.status, body?.errors);
  }

  // some endpoints (like a bare 204) won't return a body
  return res.status === 204 ? (undefined as T) : res.json();
}

// Same as request(), but sends the admin token instead of the business
// owner token. Keep admin-only endpoints (POST /admin/...) on this one,
// never the plain request() above, or an admin call would go out with
// whatever business owner happens to be logged in on the same browser.
async function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? res.statusText, res.status, body?.errors);
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

// ── WhatsApp integration ─────────────────────────────────────────────────────
// The webhook itself is one shared URL Meta calls directly, nothing here.
// These are what the dashboard's Connect WhatsApp wizard talks to.

export type WhatsAppConnectionStatus = {
  connected: boolean;
  whatsappNumber: string | null;
  connectedAt: string | null;
};

export function getWhatsAppConnectionStatus() {
  return request<WhatsAppConnectionStatus>("/integrations/whatsapp/status");
}

export type ConnectWhatsAppPayload =
  | { code: string; phoneNumberId: string; businessAccountId: string }
  | { accessToken: string; phoneNumberId: string; businessAccountId: string };

export function connectWhatsApp(payload: ConnectWhatsAppPayload) {
  return request<WhatsAppConnectionStatus>("/integrations/whatsapp/connect", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function disconnectWhatsApp() {
  return request<WhatsAppConnectionStatus>("/integrations/whatsapp/disconnect", { method: "POST" });
}

// Waitlist / early-access signup (CTA section email form)
// Expected backend contract: POST /waitlist { email } -> 200 { message }
export function joinWaitlist(email: string) {
  return request<{ message: string }>("/waitlist", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export type SignUpPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: "PK" | "KR" | "AE";
  phone: string;
  hearAbout: string;
};

// Expected backend contract: POST /auth/signup { ...SignUpPayload } -> 201 { token, user }
// On validation failure backend should return 422 with { message, errors: { field: msg } }
export function signUp(payload: SignUpPayload) {
  return request<{ token: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Facebook isn't wired up yet — Google uses googleAuth() below instead.
export function signUpWithProvider(_provider: "facebook"): Promise<never> {
  return Promise.reject(new ApiError("Social sign-up isn't set up yet.", 501));
}

export type LoginPayload = { email: string; password: string };

// Expected backend contract: POST /auth/login { email, password } -> 200 { token }
// Wrong credentials should come back as a plain 401 with { message }
export function login(payload: LoginPayload) {
  return request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// The idToken comes from Google Identity Services (see GoogleSignInButton).
// Expected backend contract: POST /auth/google { idToken } -> 200 { token }
export function googleAuth(idToken: string) {
  return request<{ token: string }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

// OTP login is two calls: request a code, then verify it.
// Expected: POST /auth/otp/request { email } -> 200 { message }
export function requestOtp(email: string) {
  return request<{ message: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Expected: POST /auth/otp/verify { email, code } -> 200 { token }
export function verifyOtp(email: string, code: string) {
  return request<{ token: string }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

// Confirms the 6-digit code sent to a new signup's inbox.
// Expected: POST /auth/verify-email { email, code } -> 200 { message }
export function verifyEmail(email: string, code: string) {
  return request<{ message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

// Password reset is two calls: request a code, then reset with it.
// Always returns success — the backend never reveals whether the email exists.
// Expected: POST /auth/forgot-password { email } -> 200 { message }
export function forgotPassword(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Expected: POST /auth/reset-password { email, code, newPassword } -> 200 { message }
export function resetPassword(email: string, code: string, newPassword: string) {
  return request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ email, code, newPassword }),
  });
}

// Team invite acceptance — the link from the invite email lands on
// /accept-invite?token=..., which reads the invite details before asking
// for a name/password, then logs the new member straight in.
export type InviteDetails = { businessName: string; email: string; role: string };

// Expected: GET /auth/invite/:token -> 200 { businessName, email, role }
export function getInviteDetails(token: string) {
  return request<InviteDetails>(`/auth/invite/${encodeURIComponent(token)}`);
}

// Expected: POST /auth/accept-invite { token, firstName, lastName, password } -> 200 { token }
export function acceptInvite(payload: { token: string; firstName: string; lastName: string; password: string }) {
  return request<{ token: string }>("/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type DemoBookingPayload = {
  name: string;
  email: string;
  billingCountry: string;
  countryCode: "PK" | "KR" | "AE";
  phone: string;
  team: string;
};

// Expected backend contract: POST /demo/book { ...DemoBookingPayload } -> 200 { message }
// this doesn't create an account, just drops a lead for sales to follow up on
export function bookDemo(payload: DemoBookingPayload) {
  return request<{ message: string }>("/demo/book", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Products, all of these need the Authorization header request() already
// attaches, they're scoped to whichever business the token belongs to.
export type ProductStatus = "active" | "draft";

// A product option like "Size" or "Color", with the values it can take.
export type ProductOption = {
  name: string;
  values: string[];
};

// One combination of option values, e.g. ["Small", "Red"], with its own
// SKU, price, and stock. When a product has variants, price and stock on
// the Product itself are derived (lowest variant price, summed stock),
// not the source of truth.
export type ProductVariant = {
  id: string;
  optionValues: string[];
  sku: string;
  price: number;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  // Base SKU, used when the product has no variants. Ignored otherwise,
  // each variant has its own SKU instead.
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  status: ProductStatus;
  description: string;
  // Data URLs for local preview right now, up to 5 per product. Backend
  // developer: once product images upload to Cloudflare R2 (see
  // R2_BUCKET_NAME in DEPLOYMENT.md), this should be the resulting public
  // URLs instead, same order as uploaded.
  images: string[];
  hasVariants: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
  createdAt: string;
};

export type ProductInput = Omit<Product, "id" | "createdAt">;

// Expected backend contract: GET /products/:id -> 200 { product: Product }
// used by the full page edit form, which loads on its own URL and can't
// rely on the list page's in-memory state.
export function getProduct(id: string) {
  return request<{ product: Product }>(`/products/${id}`);
}

// Expected backend contract: GET /products?search=&category=&status= -> 200 { products: Product[] }
export function getProducts() {
  return request<{ products: Product[] }>("/products");
}

// Expected: POST /products { ...ProductInput } -> 201 { product: Product }
export function createProduct(payload: ProductInput) {
  return request<{ product: Product }>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /products/:id { ...ProductInput } -> 200 { product: Product }
export function updateProduct(id: string, payload: ProductInput) {
  return request<{ product: Product }>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// One endpoint for both single and bulk delete, the list page always sends
// an array even when it's just one id.
// Expected: POST /products/bulk-delete { ids: string[] } -> 200 { message }
export function deleteProducts(ids: string[]) {
  return request<{ message: string }>("/products/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

// CSV import needs multipart/form-data, not JSON, so it can't go through
// the shared request() helper above (that one always sets
// Content-Type: application/json). Parsing should happen server side, not
// in the browser, a bad row in a large file shouldn't freeze someone's tab.
// Expected: POST /products/import (multipart, field name "file") -> 200 { imported: number }
export async function importProductsCsv(file: File) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/products/import`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? res.statusText, res.status, body?.errors);
  }
  return res.json() as Promise<{ imported: number }>;
}

// ── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "canceled";
export type PaymentMethod = "cod" | "online" | "jazzcash" | "easypaisa" | "stripe";

export type OrderSummary = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  itemCount: number;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type OrderDetail = {
  id: string;
  customerName: string | null;
  customerPhone: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryCharge: number;
  tax: number;
  total: number;
  deliveryAddress: string | null;
  items: OrderItem[];
  createdAt: string;
};

// Expected: GET /orders?status=&search= -> 200 { orders: OrderSummary[], counts: Record<OrderStatus, number> }
export function getOrders(params?: { status?: OrderStatus; search?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  return request<{ orders: OrderSummary[]; counts: Partial<Record<OrderStatus, number>> }>(
    `/orders${qs ? `?${qs}` : ""}`
  );
}

// Expected: GET /orders/:id -> 200 { order: OrderDetail }
export function getOrder(id: string) {
  return request<{ order: OrderDetail }>(`/orders/${id}`);
}

// Expected: PATCH /orders/:id/status { status } -> 200 { order: OrderDetail }
export function updateOrderStatus(id: string, status: OrderStatus) {
  return request<{ order: OrderDetail }>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export type OnboardingStatus = {
  whatsappConnected: boolean;
  hasProducts: boolean;
  hasPaidPlan: boolean;
  hasTeamMembers: boolean;
};

// Drives the real checkmarks on the dashboard's "Setup guide" widget.
// Expected: GET /dashboard/onboarding -> 200 OnboardingStatus
export function getOnboardingStatus() {
  return request<OnboardingStatus>("/dashboard/onboarding");
}

export type AnalyticsPoint = { date: string; orders: number; revenue: number };

// Expected: GET /dashboard/analytics?days= -> 200 { points: AnalyticsPoint[] }
export function getAnalytics(days = 30) {
  return request<{ points: AnalyticsPoint[] }>(`/dashboard/analytics?days=${days}`);
}

// ── Customers ────────────────────────────────────────────────────────────────

export type CustomerSummary = {
  id: string;
  name: string | null;
  whatsappNumber: string;
  totalSpent: number;
  createdAt: string;
};

export type CustomerOrderSummary = {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  total: number;
  createdAt: string;
};

export type CustomerDetail = CustomerSummary & { orders: CustomerOrderSummary[] };

export type CustomerNote = {
  id: string;
  note: string;
  authorName: string;
  createdAt: string;
};

// Expected: GET /customers?search= -> 200 { customers: CustomerSummary[] }
export function getCustomers(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return request<{ customers: CustomerSummary[] }>(`/customers${qs}`);
}

// Expected: GET /customers/:id -> 200 { customer: CustomerDetail }
export function getCustomer(id: string) {
  return request<{ customer: CustomerDetail }>(`/customers/${id}`);
}

// Expected: GET /customers/:id/notes -> 200 { notes: CustomerNote[] }
export function getCustomerNotes(id: string) {
  return request<{ notes: CustomerNote[] }>(`/customers/${id}/notes`);
}

// Expected: POST /customers/:id/notes { note } -> 201 { note: CustomerNote }
export function addCustomerNote(id: string, note: string) {
  return request<{ note: CustomerNote }>(`/customers/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

// Settings, split into sections so each one saves independently instead
// of forcing a save-everything-at-once form.
export type BusinessProfile = {
  businessName: string;
  category: string;
  description: string;
  supportEmail: string;
  supportPhone: string;
  // Data URL for local preview right now. Backend developer: once the
  // logo uploads to Cloudflare R2 (see R2_BUCKET_NAME in DEPLOYMENT.md),
  // this should be the resulting public URL instead.
  logo: string | null;
};

export type BusinessHourRow = {
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  open: string;
  close: string;
  closed: boolean;
};

export type DeliverySettings = {
  areas: string;
  charge: number;
  estimatedTime: string;
  cashOnDelivery: boolean;
  pickupAvailable: boolean;
};

export type TaxSettings = {
  taxName: string;
  taxRate: number;
  pricesIncludeTax: boolean;
};

export type PaymentSettings = {
  onlinePaymentDetails: string;
};

export type LanguageCode = "en" | "ur" | "ko" | "ar";

export type Settings = {
  profile: BusinessProfile;
  hours: BusinessHourRow[];
  delivery: DeliverySettings;
  tax: TaxSettings;
  payment: PaymentSettings;
  language: LanguageCode;
};

// Expected backend contract: GET /settings -> 200 { settings: Settings }
export function getSettings() {
  return request<{ settings: Settings }>("/settings");
}

// ── Billing ──────────────────────────────────────────────────────────────────

// Expected backend contract: GET /billing/trial-status -> 200 TrialStatus
export function getTrialStatus() {
  return request<TrialStatus>("/billing/trial-status");
}

// Expected backend contract: POST /billing/subscribe { plan } -> 200 TrialStatus
export function subscribeToPlan(plan: "starter" | "growth" | "business") {
  return request<TrialStatus>("/billing/subscribe", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

// Expected: PATCH /settings/profile { ...BusinessProfile } -> 200 { profile: BusinessProfile }
export function updateBusinessProfile(payload: BusinessProfile) {
  return request<{ profile: BusinessProfile }>("/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /settings/hours { hours: BusinessHourRow[] } -> 200 { hours: BusinessHourRow[] }
export function updateBusinessHours(hours: BusinessHourRow[]) {
  return request<{ hours: BusinessHourRow[] }>("/settings/hours", {
    method: "PATCH",
    body: JSON.stringify({ hours }),
  });
}

// Expected: PATCH /settings/delivery { ...DeliverySettings } -> 200 { delivery: DeliverySettings }
export function updateDeliverySettings(payload: DeliverySettings) {
  return request<{ delivery: DeliverySettings }>("/settings/delivery", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /settings/tax { ...TaxSettings } -> 200 { tax: TaxSettings }
export function updateTaxSettings(payload: TaxSettings) {
  return request<{ tax: TaxSettings }>("/settings/tax", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /settings/payment { ...PaymentSettings } -> 200 { payment: PaymentSettings }
export function updatePaymentSettings(payload: PaymentSettings) {
  return request<{ payment: PaymentSettings }>("/settings/payment", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /settings/language { language } -> 200 { language: LanguageCode }
export function updateLanguage(language: LanguageCode) {
  return request<{ language: LanguageCode }>("/settings/language", {
    method: "PATCH",
    body: JSON.stringify({ language }),
  });
}

// Team, roles are simple and role based rather than a granular permission
// matrix: owner has full access including billing, admin manages
// everything except billing, staff only handles conversations and views
// orders. The person who signed up is always the owner and can't be
// removed or changed through these endpoints.
export type TeamRole = "owner" | "admin" | "staff";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "invited";
};

// Expected backend contract: GET /team -> 200 { members: TeamMember[] }
export function getTeamMembers() {
  return request<{ members: TeamMember[] }>("/team");
}

// Expected: POST /team/invite { email, role } -> 201 { member: TeamMember },
// status starts as "invited" until they accept the email invite
export function inviteTeamMember(payload: { email: string; role: TeamRole }) {
  return request<{ member: TeamMember }>("/team/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /team/:id/role { role } -> 200 { member: TeamMember }
export function updateTeamMemberRole(id: string, role: TeamRole) {
  return request<{ member: TeamMember }>(`/team/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

// Expected: DELETE /team/:id -> 200 { message }
export function removeTeamMember(id: string) {
  return request<{ message: string }>(`/team/${id}`, {
    method: "DELETE",
  });
}

// Interactive Messages (Automation). The whole point of this feature is
// that a business owner never sees WhatsApp's actual message JSON or
// hears the words "Cloud API". They pick a template, describe what they
// want in plain language, and get an editable preview back. Backend
// developer: this is where you translate InteractiveMessage into the
// real WhatsApp interactive message payload (buttons or list) and send
// it through the Cloud API when the trigger fires.
export type InteractiveMessageTemplate =
  | "order_confirmation"
  | "payment_reminder"
  | "delivery_update"
  | "welcome_message"
  | "custom";

export type InteractiveMessageTrigger = "after_order_created" | "after_payment" | "after_shipping" | "manual";

export type InteractiveMessageKind = "buttons" | "list";

export type InteractiveButton = { id: string; text: string };
export type InteractiveListRow = { id: string; title: string };

export type InteractiveMessage = {
  id: string;
  template: InteractiveMessageTemplate;
  prompt: string;
  bodyText: string;
  kind: InteractiveMessageKind;
  buttons: InteractiveButton[];
  listButtonLabel: string;
  listRows: InteractiveListRow[];
  trigger: InteractiveMessageTrigger;
  status: "active" | "draft";
  createdAt: string;
};

export type InteractiveMessageInput = Omit<InteractiveMessage, "id" | "createdAt">;

// Expected backend contract: GET /automation/interactive-messages -> 200 { messages: InteractiveMessage[] }
export function getInteractiveMessages() {
  return request<{ messages: InteractiveMessage[] }>("/automation/interactive-messages");
}

// Expected: GET /automation/interactive-messages/:id -> 200 { message: InteractiveMessage }
export function getInteractiveMessage(id: string) {
  return request<{ message: InteractiveMessage }>(`/automation/interactive-messages/${id}`);
}

// Expected: POST /automation/interactive-messages { ...InteractiveMessageInput } -> 201 { message: InteractiveMessage }
export function createInteractiveMessage(payload: InteractiveMessageInput) {
  return request<{ message: InteractiveMessage }>("/automation/interactive-messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Expected: PATCH /automation/interactive-messages/:id { ...InteractiveMessageInput } -> 200 { message: InteractiveMessage }
export function updateInteractiveMessage(id: string, payload: InteractiveMessageInput) {
  return request<{ message: InteractiveMessage }>(`/automation/interactive-messages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Expected: DELETE /automation/interactive-messages/:id -> 200 { message: string }
export function deleteInteractiveMessage(id: string) {
  return request<{ message: string }>(`/automation/interactive-messages/${id}`, {
    method: "DELETE",
  });
}

// Exofe admin, separate login from the business owner one above. No
// signup here on purpose, admin accounts only get created by someone
// running a script on the server.
export type AdminLoginPayload = { email: string; password: string };

// Expected backend contract: POST /admin/auth/login { email, password } -> 200 { token }
// Wrong credentials come back as a plain 401 with { message }, and on
// purpose don't say whether the email exists or the password was wrong.
export function adminLogin(payload: AdminLoginPayload) {
  return adminRequest<{ token: string }>("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "owner" | "staff";
  phone: string | null;
  countryCode: string | null;
  businessName: string | null;
  emailVerified: boolean;
  createdAt: string;
};

// Expected backend contract: GET /admin/users -> 200 { users: AdminUser[] }
export function getAdminUsers() {
  return adminRequest<{ users: AdminUser[] }>("/admin/users");
}

export type AdminSubscription = {
  id: string;
  businessId: string;
  businessName: string | null;
  plan: "trial" | "starter" | "growth" | "business";
  status: "trialing" | "active" | "past_due" | "canceled";
  amount: number;
  currentPeriodEnd: string;
};

// Expected backend contract: GET /admin/subscriptions -> 200 { subscriptions: AdminSubscription[] }
export function getAdminSubscriptions() {
  return adminRequest<{ subscriptions: AdminSubscription[] }>("/admin/subscriptions");
}

// Manually puts a business on a paid plan — for marking a manual/offline
// payment (bank transfer, JazzCash, etc.) as active until a real payment
// gateway is wired up.
// Expected backend contract: PATCH /admin/subscriptions/{businessId}/activate
// { plan, amount } -> 200 { ...AdminSubscription }
export function activateSubscription(businessId: string, payload: { plan: "starter" | "growth" | "business"; amount: number }) {
  return adminRequest<AdminSubscription>(`/admin/subscriptions/${businessId}/activate`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ── AI Assistant ─────────────────────────────────────────────────────────────

export type AITone = "friendly" | "formal" | "brief";

export type AISettings = {
  businessPrompt: string;
  tone: AITone;
  greetingMessage: string;
  handoverEnabled: boolean;
};

export function getAISettings() {
  return request<{ settings: AISettings }>("/ai/settings");
}

export function updateAISettings(payload: AISettings) {
  return request<{ settings: AISettings }>("/ai/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type Faq = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
};

export function getFaqs() {
  return request<{ faqs: Faq[] }>("/ai/faqs");
}

export function createFaq(payload: { question: string; answer: string }) {
  return request<{ faq: Faq }>("/ai/faqs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateFaq(id: string, payload: { question: string; answer: string }) {
  return request<{ faq: Faq }>(`/ai/faqs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteFaq(id: string) {
  return request<void>(`/ai/faqs/${id}`, { method: "DELETE" });
}

export type AIUsage = {
  monthCount: number;
  monthLimit: number | null; // null = unlimited (Business plan)
  blocked: boolean;
  blockedUntil: string | null;
};

export function getAIUsage() {
  return request<{ usage: AIUsage }>("/ai/usage");
}
