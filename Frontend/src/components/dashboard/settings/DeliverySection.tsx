"use client";

import { useState } from "react";
import { ApiError, updateDeliverySettings, type DeliverySettings } from "@/lib/api";
import SettingsSectionCard from "./SettingsSectionCard";

const inputClass = "mt-1.5 w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30";

export default function DeliverySection({
  initial,
  onSaved,
}: {
  initial: DeliverySettings;
  onSaved: (delivery: DeliverySettings) => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof DeliverySettings>(key: K, value: DeliverySettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { delivery } = await updateDeliverySettings(form);
      onSaved(delivery);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save delivery settings right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Delivery Charges"
      description="How orders get delivered, and what customers pay for it."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div>
        <label className="text-xs font-semibold text-foreground/70">Delivery Areas</label>
        <textarea
          value={form.areas}
          onChange={(e) => setField("areas", e.target.value)}
          rows={2}
          placeholder="Lahore, Karachi, Islamabad"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-foreground/70">Delivery Charge (PKR)</label>
          <input
            type="number"
            min="0"
            value={form.charge}
            onChange={(e) => setField("charge", Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/70">Estimated Delivery Time</label>
          <input
            type="text"
            value={form.estimatedTime}
            onChange={(e) => setField("estimatedTime", e.target.value)}
            placeholder="1 to 2 business days"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 rounded-xl border border-ink/[.08] bg-ink/[.015] px-3.5 py-3 text-sm text-foreground/75">
          <input
            type="checkbox"
            checked={form.cashOnDelivery}
            onChange={(e) => setField("cashOnDelivery", e.target.checked)}
            className="h-4 w-4 rounded border-ink/[.2] text-[#45157b] focus:ring-[#45157b]/30"
          />
          Cash on delivery available
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-ink/[.08] bg-ink/[.015] px-3.5 py-3 text-sm text-foreground/75">
          <input
            type="checkbox"
            checked={form.pickupAvailable}
            onChange={(e) => setField("pickupAvailable", e.target.checked)}
            className="h-4 w-4 rounded border-ink/[.2] text-[#45157b] focus:ring-[#45157b]/30"
          />
          Customers can pick up their order
        </label>
      </div>
    </SettingsSectionCard>
  );
}
