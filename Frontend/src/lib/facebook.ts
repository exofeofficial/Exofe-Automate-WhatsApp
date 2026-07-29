// Loads the Facebook JS SDK once and exposes the bits Embedded Signup
// needs — used by Step2EmbeddedConnect.

export type FacebookLoginResponse = {
  authResponse: { code?: string } | null;
  status: "connected" | "not_authorized" | "unknown";
};

export type WhatsAppSignupData = {
  phone_number_id: string;
  waba_id: string;
};

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (config: {
        appId: string;
        version: string;
        xfbml?: boolean;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: {
          config_id: string;
          response_type: "code";
          override_default_response_type: true;
        }
      ) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadFacebookScript(appId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.FB) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, version: "v21.0", xfbml: false });
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load the Facebook SDK"));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

// Embedded Signup's popup posts the phone_number_id/waba_id it picked via
// window.postMessage — FB.login()'s own callback only ever hands back the
// authorization code, never these ids.
export function listenForWhatsAppSignupData(onData: (data: WhatsAppSignupData) => void): () => void {
  const handler = (event: MessageEvent) => {
    if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
    try {
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH" && data?.data) {
        onData(data.data as WhatsAppSignupData);
      }
    } catch {
      // not a JSON message we care about
    }
  };

  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
