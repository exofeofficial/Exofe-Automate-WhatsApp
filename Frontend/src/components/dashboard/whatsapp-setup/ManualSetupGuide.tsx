"use client";

import { AppWindow, BadgeCheck, MessageSquarePlus, Phone } from "lucide-react";

const GUIDE_STEPS = [
  {
    title: "Open Meta for Developers and create an app",
    detail: "Go to developers.facebook.com, create a Business type app under your account.",
    icon: AppWindow,
  },
  {
    title: "Add the WhatsApp product",
    detail: "From your app dashboard, add WhatsApp, Meta will create a test business account for you.",
    icon: MessageSquarePlus,
  },
  {
    title: "Verify your business",
    detail: "In Meta Business Manager, submit your business details for verification.",
    icon: BadgeCheck,
  },
  {
    title: "Add your phone number",
    detail: "Add and verify the number customers will message under WhatsApp, API Setup.",
    icon: Phone,
  },
];

export default function ManualSetupGuide() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/[.06] bg-black/[.015] p-4">
      <p className="text-xs font-semibold text-foreground/60">Before you start, on Meta&apos;s side</p>
      <div className="flex flex-col gap-3">
        {GUIDE_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-foreground/50 shadow-sm">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/75">
                  <Icon className="h-3.5 w-3.5 text-[#5B4FE9]" strokeWidth={2} />
                  {step.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/45">{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
