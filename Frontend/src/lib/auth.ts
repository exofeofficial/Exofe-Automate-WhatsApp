// bare bones client-side auth until the backend issues real sessions.
// login/signup call setToken() on success, the dashboard layout checks
// getToken() and bounces to /login if it's missing.
//
// Stored in a cookie, not localStorage: localStorage is per-origin, so a
// token set on exofe.com (marketing/login) would be invisible on
// app.exofe.com (the dashboard) — a cookie scoped to the whole .exofe.com
// apex is readable from every subdomain. Matches the backend JWT's own
// 7-day expiry (see TOKEN_EXPIRE_DAYS in core/security.py).
const TOKEN_KEY = "exofe_token";
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

// localhost/IP dev servers can't set a leading-dot domain attribute —
// only real exofe.com subdomains share the cookie that way.
function cookieDomain(): string {
  const host = window.location.hostname;
  return host === "exofe.com" || host.endsWith(".exofe.com") ? ".exofe.com" : host;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  return readCookie(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; domain=${cookieDomain()}; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearToken() {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_KEY}=; path=/; domain=${cookieDomain()}; max-age=0; SameSite=Lax`;
}

// Sends the browser to the dashboard after a successful login/signup — a
// full navigation to NEXT_PUBLIC_APP_URL (app.exofe.com in production)
// when that's configured, since moving to a different subdomain isn't
// something the Next.js router can do client-side. Falls back to a
// same-origin client-side push locally, where APP_URL isn't set.
export function goToDashboard(router: { push: (href: string) => void }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    window.location.href = `${appUrl}/dashboard`;
  } else {
    router.push("/dashboard");
  }
}

// Sends the browser back to the marketing site after logout — a full
// navigation to NEXT_PUBLIC_MARKETING_URL (exofe.com in production) when
// that's configured, the mirror image of goToDashboard above. Falls back
// to a same-origin client-side push locally.
export function goToMarketing(router: { push: (href: string) => void }) {
  const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL;
  if (marketingUrl) {
    window.location.href = marketingUrl;
  } else {
    router.push("/");
  }
}
