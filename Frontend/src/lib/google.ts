// Loads the Google Identity Services script once and exposes a small
// typed surface for it — used by GoogleSignInButton.

export type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadGoogleScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// Pulls a display name/email out of the ID token payload just for the
// local profile cache — purely cosmetic, the backend independently
// verifies the token's signature before trusting any of it.
export function decodeGoogleIdToken(idToken: string): { firstName: string; lastName: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1]));
    return {
      firstName: payload.given_name ?? (payload.name?.split(" ")[0] || "there"),
      lastName: payload.family_name ?? "",
      email: payload.email ?? "",
    };
  } catch {
    return null;
  }
}
