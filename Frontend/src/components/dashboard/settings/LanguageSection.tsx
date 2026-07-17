"use client";

import { useState } from "react";
import { ApiError, updateLanguage, type LanguageCode } from "@/lib/api";
import SettingsSectionCard from "./SettingsSectionCard";

const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ur", label: "Urdu", flag: "🇵🇰" },
  { code: "ko", label: "Korean", flag: "🇰🇷" },
  { code: "ar", label: "Arabic", flag: "🇦🇪" },
];

export default function LanguageSection({
  initial,
  onSaved,
}: {
  initial: LanguageCode;
  onSaved: (language: LanguageCode) => void;
}) {
  const [language, setLanguage] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateLanguage(language);
      onSaved(res.language);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your language right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Language"
      description="The dashboard and the AI assistant's replies use this language."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => {
              setLanguage(l.code);
              setSaved(false);
            }}
            className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
              language === l.code ? "border-[#5B4FE9] bg-indigo-50 dark:bg-indigo-500/15 text-[#5B4FE9]" : "border-ink/[.1] text-foreground/65 hover:bg-ink/[.03]"
            }`}
          >
            <span className="text-xl">{l.flag}</span>
            {l.label}
          </button>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
