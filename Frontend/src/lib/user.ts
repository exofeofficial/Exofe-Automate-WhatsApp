// Signed in user's display info, stored in localStorage since there is no
// backend yet. Backend developer: replace this with a real fetch to
// GET /me once the auth token is issued, keep the UserProfile shape the
// same, the dashboard greeting and topbar read firstName from here.
const STORAGE_KEY = "exofe_user";

export type UserProfile = {
  firstName: string;
  lastName?: string;
  email: string;
};

export function getUserProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function setUserProfile(profile: UserProfile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

// Login only collects an email and password, there is no name to greet
// someone with unless they signed up on this device before. Fall back to
// a name guessed from the email so the dashboard greeting never looks
// broken, GET /me on a real backend would return the actual name instead.
export function ensureUserProfile(email: string): UserProfile {
  const existing = getUserProfile();
  if (existing && existing.email === email) return existing;

  const local = email.split("@")[0] ?? "";
  const firstWord = local.split(/[._\-\d]+/).filter(Boolean)[0] ?? "there";
  const firstName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();

  const profile: UserProfile = { firstName, email };
  setUserProfile(profile);
  return profile;
}
