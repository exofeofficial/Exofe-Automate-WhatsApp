"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { FacebookMark, WhatsAppIcon } from "@/components/dashboard/IntegrationIcons";
import { ApiError, connectWhatsApp } from "@/lib/api";
import { listenForWhatsAppSignupData, loadFacebookScript, type WhatsAppSignupData } from "@/lib/facebook";

const PHASES = [
  "Opening Facebook login...",
  "Selecting your business...",
  "Selecting your phone number...",
  "Requesting permissions...",
  "Bringing you back to Exofe...",
];

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID;
const WHATSAPP_CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID;

export default function Step2EmbeddedConnect({
  onConnected,
  onUseManualSetup,
}: {
  onConnected: () => void;
  onUseManualSetup: () => void;
}) {
  const [state, setState] = useState<"idle" | "connecting" | "done">("idle");
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleContinueWithFacebook = async () => {
    if (!META_APP_ID || !WHATSAPP_CONFIG_ID) {
      setError("WhatsApp Embedded Signup isn't configured yet — use manual setup below instead.");
      return;
    }

    setError(null);
    setState("connecting");
    setPhase(0);
    const advancePhase = PHASES.map((_, i) => setTimeout(() => setPhase(i), i * 700));

    try {
      await loadFacebookScript(META_APP_ID);

      // Meta posts the phone_number_id/waba_id the user picked via
      // window.postMessage — FB.login()'s own callback only ever hands
      // back the authorization code, so both are captured together below.
      let signupData: WhatsAppSignupData | null = null;
      const stopListening = listenForWhatsAppSignupData((data) => {
        signupData = data;
      });

      const code = await new Promise<string>((resolve, reject) => {
        window.FB!.login(
          (response) => {
            if (response.status === "connected" && response.authResponse?.code) {
              resolve(response.authResponse.code);
            } else {
              reject(new Error("Facebook login was cancelled or didn't complete."));
            }
          },
          { config_id: WHATSAPP_CONFIG_ID, response_type: "code", override_default_response_type: true }
        );
      });

      // The postMessage event can arrive slightly after FB.login()'s
      // callback — give it a brief moment before giving up on it.
      for (let i = 0; i < 20 && !signupData; i++) {
        await new Promise((r) => setTimeout(r, 100));
      }
      stopListening();

      if (!signupData) {
        throw new Error("Didn't receive your business/phone number selection from Meta — please try again.");
      }

      await connectWhatsApp({
        code,
        phoneNumberId: (signupData as WhatsAppSignupData).phone_number_id,
        businessAccountId: (signupData as WhatsAppSignupData).waba_id,
      });

      advancePhase.forEach(clearTimeout);
      setPhase(PHASES.length - 1);
      setState("done");
      setTimeout(onConnected, 700);
    } catch (err) {
      advancePhase.forEach(clearTimeout);
      setState("idle");
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (state === "connecting") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5B4FE9]" strokeWidth={2} />
        <p className="text-sm font-medium text-foreground/70">{PHASES[phase]}</p>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-semibold text-foreground">Connected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink/[.03]">
        <WhatsAppIcon />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">Connect your WhatsApp Business Account</p>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-foreground/50">
          We connect securely through Meta. No technical setup, no codes to copy, just log in and pick your
          business.
        </p>
      </div>

      {error && <p className="max-w-xs text-xs text-red-500 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleContinueWithFacebook}
        className="mt-2 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#1877F2] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        <FacebookMark />
        Continue with Facebook
      </button>

      <button
        type="button"
        onClick={onUseManualSetup}
        className="text-xs font-medium text-foreground/40 underline-offset-2 hover:text-foreground/70 hover:underline"
      >
        I already have a Meta Developer account, set up manually
      </button>
    </div>
  );
}
