"use client";

import { useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import type { WhatsAppCredentials } from "./types";

// Backend developer: the webhookVerifyToken entered here is per business,
// but the actual webhook URL registered with Meta is one shared endpoint
// for the whole app, see the webhook setup notes at the top of
// src/lib/whatsapp.ts for how verification and event handling should work.
const FIELDS: {
  key: keyof WhatsAppCredentials;
  label: string;
  helper: string;
  secret?: boolean;
}[] = [
  {
    key: "metaAppId",
    label: "Meta App ID",
    helper: "Meta for Developers, your app, Basic Settings, App ID.",
  },
  {
    key: "businessAccountId",
    label: "WhatsApp Business Account ID",
    helper: "Meta Business Manager, WhatsApp Accounts, the account you want to connect.",
  },
  {
    key: "phoneNumberId",
    label: "Phone Number ID",
    helper: "Meta for Developers, WhatsApp, API Setup, under your business phone number.",
  },
  {
    key: "accessToken",
    label: "Permanent Access Token",
    helper: "Generate this for a System User with the whatsapp_business_messaging permission.",
    secret: true,
  },
  {
    key: "webhookVerifyToken",
    label: "Webhook Verify Token",
    helper: "Any string you choose. Enter this same value when Meta asks you to verify the webhook.",
    secret: true,
  },
];

const inputClass = (hasError: boolean) =>
  `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
    hasError ? "border-red-400" : "border-black/[.12]"
  }`;

export default function Step2ConnectWhatsApp({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: WhatsAppCredentials;
  onChange: (v: WhatsAppCredentials) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<Partial<Record<keyof WhatsAppCredentials, string>>>({});
  const [reveal, setReveal] = useState<Partial<Record<keyof WhatsAppCredentials, boolean>>>({});
  const [testState, setTestState] = useState<"idle" | "testing" | "success">("idle");

  const setField = (key: keyof WhatsAppCredentials, val: string) => {
    onChange({ ...value, [key]: val });
    setErrors((e) => ({ ...e, [key]: undefined }));
    setTestState("idle");
  };

  // Backend developer: this should call POST /integrations/whatsapp/test
  // with these five values, which does a real Graph API call server side.
  // Access tokens should never be validated or stored from the browser
  // directly, that request has to go through your backend.
  const handleTestConnection = () => {
    const next: Partial<Record<keyof WhatsAppCredentials, string>> = {};
    FIELDS.forEach((f) => {
      if (!value[f.key].trim()) next[f.key] = "Required";
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setTestState("testing");
    setTimeout(() => setTestState("success"), 1300);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground">Connect WhatsApp</p>
        <p className="mt-1 text-xs text-foreground/50">
          Exofe uses the official WhatsApp Business Cloud API. Paste in the values from your Meta app below.
        </p>
      </div>

      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="text-xs font-semibold text-foreground/70">* {f.label}</label>
          <div className="relative">
            <input
              type={f.secret && !reveal[f.key] ? "password" : "text"}
              value={value[f.key]}
              onChange={(e) => setField(f.key, e.target.value)}
              className={inputClass(Boolean(errors[f.key]))}
            />
            {f.secret && (
              <button
                type="button"
                onClick={() => setReveal((r) => ({ ...r, [f.key]: !r[f.key] }))}
                aria-label={reveal[f.key] ? "Hide value" : "Show value"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
              >
                {reveal[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          {errors[f.key] ? (
            <p className="mt-1 text-xs text-red-500">{errors[f.key]}</p>
          ) : (
            <p className="mt-1 text-[11px] text-foreground/40">{f.helper}</p>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={handleTestConnection}
        disabled={testState === "testing"}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors disabled:opacity-70 ${
          testState === "success"
            ? "bg-emerald-50 text-emerald-600"
            : "bg-black/[.04] text-foreground/70 hover:bg-black/[.07]"
        }`}
      >
        {testState === "testing" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
        {testState === "success" && <Check className="h-4 w-4" strokeWidth={2.5} />}
        {testState === "testing" ? "Testing connection..." : testState === "success" ? "Connection looks good" : "Test Connection"}
      </button>

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl bg-black/[.04] py-3 text-sm font-semibold text-foreground/70 hover:bg-black/[.07]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={testState !== "success"}
          className="flex-1 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
