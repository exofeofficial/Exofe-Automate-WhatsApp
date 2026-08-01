"use client";

import { useState } from "react";
import { ApiError, updateTaxSettings, type TaxSettings } from "@/lib/api";
import SettingsSectionCard from "./SettingsSectionCard";

const inputClass = "mt-1.5 w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30";

export default function TaxSection({
  initial,
  onSaved,
}: {
  initial: TaxSettings;
  onSaved: (tax: TaxSettings) => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof TaxSettings>(key: K, value: TaxSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { tax } = await updateTaxSettings(form);
      onSaved(tax);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save tax settings right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Taxes"
      description="Applied to orders the AI assistant creates."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-foreground/70">Tax Name</label>
          <input
            type="text"
            value={form.taxName}
            onChange={(e) => setField("taxName", e.target.value)}
            placeholder="Sales Tax"
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/70">Tax Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.taxRate}
            onChange={(e) => setField("taxRate", Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-ink/[.08] bg-ink/[.015] px-3.5 py-3 text-sm text-foreground/75">
        <input
          type="checkbox"
          checked={form.pricesIncludeTax}
          onChange={(e) => setField("pricesIncludeTax", e.target.checked)}
          className="h-4 w-4 rounded border-ink/[.2] text-[#45157b] focus:ring-[#45157b]/30"
        />
        Product prices already include tax
      </label>
    </SettingsSectionCard>
  );
}
