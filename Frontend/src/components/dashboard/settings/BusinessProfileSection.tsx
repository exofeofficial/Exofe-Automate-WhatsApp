"use client";

import { useRef, useState } from "react";
import { Building2, ImagePlus } from "lucide-react";
import { ApiError, updateBusinessProfile, type BusinessProfile } from "@/lib/api";
import SettingsSectionCard from "./SettingsSectionCard";

const inputClass = (hasError: boolean) =>
  `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
    hasError ? "border-red-400 dark:border-red-500/50" : "border-ink/[.12]"
  }`;

const CATEGORIES = ["Fashion and Apparel", "Food and Beverage", "Electronics", "Beauty and Cosmetics", "Home and Living", "Grocery", "Services", "Other"];

export default function BusinessProfileSection({
  initial,
  onSaved,
}: {
  initial: BusinessProfile;
  onSaved: (profile: BusinessProfile) => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessProfile, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setField = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSaved(false);
  };

  const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setField("logo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const next: Partial<Record<keyof BusinessProfile, string>> = {};
    if (!form.businessName.trim()) next.businessName = "Business name is required";
    if (!form.supportEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail)) {
      next.supportEmail = "Enter a valid email";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const { profile } = await updateBusinessProfile(form);
      onSaved(profile);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your business profile right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Business Profile"
      description="This is what customers and Meta see for your business."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div>
        <label className="text-xs font-semibold text-foreground/70">Logo</label>
        <div className="mt-1.5 flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-ink/[.15] bg-ink/[.02] text-foreground/35 hover:bg-ink/[.04]"
          >
            {form.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-7 w-7" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-ink/[.04] px-3.5 py-2 text-xs font-semibold text-foreground/70 hover:bg-ink/[.07]"
          >
            <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
            {form.logo ? "Change logo" : "Upload logo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoPick} className="hidden" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">* Business Name</label>
        <input
          type="text"
          value={form.businessName}
          onChange={(e) => setField("businessName", e.target.value)}
          placeholder="Ayesha Boutique"
          className={inputClass(Boolean(errors.businessName))}
        />
        {errors.businessName && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.businessName}</p>}
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">Category</label>
        <select
          value={form.category}
          onChange={(e) => setField("category", e.target.value)}
          className={`${inputClass(false)} bg-surface ${form.category ? "text-foreground" : "text-foreground/40"}`}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={3}
          placeholder="We sell premium clothing for women."
          className="mt-1.5 w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-foreground/70">* Support Email</label>
          <input
            type="email"
            value={form.supportEmail}
            onChange={(e) => setField("supportEmail", e.target.value)}
            placeholder="support@yourbusiness.com"
            className={inputClass(Boolean(errors.supportEmail))}
          />
          {errors.supportEmail && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.supportEmail}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground/70">Support Phone</label>
          <input
            type="tel"
            value={form.supportPhone}
            onChange={(e) => setField("supportPhone", e.target.value)}
            placeholder="+92 300 1234567"
            className={inputClass(false)}
          />
        </div>
      </div>
    </SettingsSectionCard>
  );
}
