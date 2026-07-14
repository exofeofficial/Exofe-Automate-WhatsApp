"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Step2EmbeddedConnect from "./Step2EmbeddedConnect";
import Step2ConnectWhatsApp from "./Step2ConnectWhatsApp";
import ManualSetupGuide from "./ManualSetupGuide";
import type { WhatsAppCredentials } from "./types";

// Two ways to connect: the embedded flow (default, recommended for most
// business owners) or manual credential entry for people who already run
// their own Meta Developer app. Most Pakistani small business owners have
// never heard of a WABA ID or an access token, so that form should never
// be the first thing they see.
export default function Step2Connect({
  credentials,
  onCredentialsChange,
  onNext,
  onBack,
}: {
  credentials: WhatsAppCredentials;
  onCredentialsChange: (v: WhatsAppCredentials) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"embedded" | "manual">("embedded");

  if (mode === "embedded") {
    return (
      <Step2EmbeddedConnect onConnected={onNext} onUseManualSetup={() => setMode("manual")} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setMode("embedded")}
        className="flex items-center gap-1.5 text-xs font-medium text-foreground/40 hover:text-foreground/70"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Use the easy setup instead
      </button>

      <ManualSetupGuide />

      <Step2ConnectWhatsApp value={credentials} onChange={onCredentialsChange} onNext={onNext} onBack={onBack} />
    </div>
  );
}
