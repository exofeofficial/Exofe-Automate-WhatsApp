"use client";

import { useState } from "react";
import { ApiError, updatePaymentSettings, type PaymentSettings } from "@/lib/api";
import SettingsSectionCard from "./SettingsSectionCard";

const inputClass = "mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30";

export default function PaymentSection({
  initial,
  onSaved,
}: {
  initial: PaymentSettings;
  onSaved: (payment: PaymentSettings) => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { payment } = await updatePaymentSettings(form);
      onSaved(payment);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save payment settings right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Payment Details"
      description="Shared with a customer on WhatsApp when they choose to pay online instead of Cash on Delivery."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div>
        <label className="text-xs font-semibold text-foreground/70">Online Payment Details</label>
        <textarea
          value={form.onlinePaymentDetails}
          onChange={(e) => {
            setForm({ onlinePaymentDetails: e.target.value });
            setSaved(false);
          }}
          rows={3}
          placeholder="JazzCash: 0300-1234567 (Your Store Name)"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-foreground/45">
          No payment gateway is connected yet — the AI reads this back to the customer verbatim, and you confirm payment
          was received yourself.
        </p>
      </div>
    </SettingsSectionCard>
  );
}
