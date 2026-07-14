// bare bones client-side auth until the backend issues real sessions.
// login/signup call setToken() on success, the dashboard layout checks
// getToken() and bounces to /login if it's missing.
const TOKEN_KEY = "exofe_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
