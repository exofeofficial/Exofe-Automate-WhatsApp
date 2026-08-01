"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAISettings, getAIUsage, getFaqs, type AISettings, type AIUsage, type Faq } from "@/lib/api";
import AIBehaviorSection from "@/components/dashboard/ai/AIBehaviorSection";
import AIUsageCard from "@/components/dashboard/ai/AIUsageCard";
import FaqSection from "@/components/dashboard/ai/FaqSection";

const DEFAULT_SETTINGS: AISettings = {
  businessPrompt: "",
  tone: "friendly",
  greetingMessage: "",
  handoverEnabled: true,
};

export default function AIAssistantPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [usage, setUsage] = useState<AIUsage | null>(null);

  useEffect(() => {
    getAISettings()
      .then((res) => setSettings(res.settings))
      .catch(() => setSettings(DEFAULT_SETTINGS));
    getFaqs()
      .then((res) => setFaqs(res.faqs))
      .catch(() => setFaqs([]));
    // usage card is non-critical — just stays hidden if it can't load
    getAIUsage()
      .then((res) => setUsage(res.usage))
      .catch(() => {});
  }, []);

  if (!settings || !faqs) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-foreground/55">
        Customize how the AI assistant represents your business on WhatsApp — its tone, what it knows, and when it hands off to your team.
      </p>

      {usage && <AIUsageCard usage={usage} />}
      <AIBehaviorSection initial={settings} onSaved={setSettings} />
      <FaqSection initial={faqs} />
    </div>
  );
}
