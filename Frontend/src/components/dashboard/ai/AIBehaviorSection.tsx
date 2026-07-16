"use client";

import { useState } from "react";
import { ApiError, updateAISettings, type AISettings, type AITone } from "@/lib/api";
import Dropdown from "@/components/ui/Dropdown";
import SettingsSectionCard from "@/components/dashboard/settings/SettingsSectionCard";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30";

const TONE_OPTIONS: { value: AITone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "brief", label: "Brief" },
];

export default function AIBehaviorSection({
  initial,
  onSaved,
}: {
  initial: AISettings;
  onSaved: (settings: AISettings) => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { settings } = await updateAISettings(form);
      onSaved(settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save AI settings right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="AI Behavior"
      description="How your AI assistant talks to customers on WhatsApp."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div>
        <label className="text-xs font-semibold text-foreground/70">Business Prompt</label>
        <textarea
          value={form.businessPrompt}
          onChange={(e) => setField("businessPrompt", e.target.value)}
          rows={4}
          placeholder="Tell the AI about your business — what you sell, how orders work, anything it should know before replying to customers."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-foreground/70">Reply Tone</label>
          <Dropdown
            value={form.tone}
            onChange={(v) => setField("tone", v as AITone)}
            options={TONE_OPTIONS}
            placeholder="Select tone"
            className="mt-1.5"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/70">Greeting Message</label>
          <input
            type="text"
            value={form.greetingMessage}
            onChange={(e) => setField("greetingMessage", e.target.value)}
            placeholder="Hi! Welcome, how can I help you today?"
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-black/[.08] bg-black/[.015] px-3.5 py-3 text-sm text-foreground/75">
        <input
          type="checkbox"
          checked={form.handoverEnabled}
          onChange={(e) => setField("handoverEnabled", e.target.checked)}
          className="h-4 w-4 rounded border-black/[.2] text-[#5B4FE9] focus:ring-[#5B4FE9]/30"
        />
        Let the AI reply automatically (turn off to route every message to your team instead)
      </label>
    </SettingsSectionCard>
  );
}
