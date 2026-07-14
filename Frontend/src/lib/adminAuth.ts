// Separate from lib/auth.ts on purpose. A business owner's login and an
// Exofe admin's login are two different accounts, using the same
// localStorage key would let one silently overwrite the other if
// someone had both open in the same browser.
const ADMIN_TOKEN_KEY = "exofe_admin_token";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}
