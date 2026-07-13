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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
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

// Google/Facebook buttons are wired to these so the click flow already exists —
// backend just needs to swap this for the real OAuth redirect/popup when it's ready.
export function signUpWithProvider(_provider: "google" | "facebook"): Promise<never> {
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

export function loginWithProvider(_provider: "google"): Promise<never> {
  return Promise.reject(new ApiError("Social login isn't set up yet.", 501));
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
