"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { FacebookMark, WhatsAppIcon } from "@/components/dashboard/IntegrationIcons";

const PHASES = [
  "Opening Facebook login...",
  "Selecting your business...",
  "Selecting your phone number...",
  "Requesting permissions...",
  "Bringing you back to Exofe...",
];

// This is the default, recommended path. Meta's Embedded Signup handles
// login, business selection, phone number selection, and permissions
// inside its own popup, the business owner never sees or copies a single
// technical value.
//
// Backend developer: the real button calls the Facebook JS SDK,
// FB.login({ config_id: WHATSAPP_CONFIG_ID, response_type: "code",
// override_default_response_type: true }), then you exchange the
// returned code server side for a WABA ID, phone number ID, and a
// permanent access token through the Graph API, and POST the result to
// /integrations/whatsapp/connect. Nothing below the button is real,
// it is just standing in for that popup while there is no backend yet.
//
// The webhook itself does not need any extra setup per business here,
// it is one shared URL for the whole app (see src/lib/whatsapp.ts), Meta
// just starts sending this business's events to it as soon as the
// connection above succeeds and the phone number is subscribed.
export default function Step2EmbeddedConnect({
  onConnected,
  onUseManualSetup,
}: {
  onConnected: () => void;
  onUseManualSetup: () => void;
}) {
  const [state, setState] = useState<"idle" | "connecting" | "done">("idle");
  const [phase, setPhase] = useState(0);

  const handleContinueWithFacebook = () => {
    setState("connecting");
    setPhase(0);
    PHASES.forEach((_, i) => {
      setTimeout(() => setPhase(i), i * 700);
    });
    setTimeout(() => {
      setState("done");
      setTimeout(onConnected, 700);
    }, PHASES.length * 700);
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
