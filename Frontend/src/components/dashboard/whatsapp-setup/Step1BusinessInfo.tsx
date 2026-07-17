"use client";

import { useState } from "react";
import { COUNTRIES, PHONE_PLACEHOLDER, type CountryCode } from "@/lib/countries";
import { BUSINESS_CATEGORIES, TIMEZONE_BY_COUNTRY, type BusinessInfo } from "./types";

const inputClass = (hasError: boolean) =>
  `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
    hasError ? "border-red-400 dark:border-red-500/50" : "border-ink/[.12]"
  }`;

type Errors = Partial<Record<keyof BusinessInfo, string>>;

export default function Step1BusinessInfo({
  value,
  onChange,
  onNext,
}: {
  value: BusinessInfo;
  onChange: (v: BusinessInfo) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});

  const setField = <K extends keyof BusinessInfo>(key: K, val: BusinessInfo[K]) => {
    onChange({ ...value, [key]: val });
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next: Errors = {};
    if (!value.businessName.trim()) next.businessName = "Business name is required";
    if (!value.category) next.category = "Pick a category";
    if (!value.supportEmail.trim()) next.supportEmail = "Support email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.supportEmail)) next.supportEmail = "That doesn't look like a valid email";
    if (!value.businessPhone.trim()) next.businessPhone = "Business phone is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleContinue = () => {
    if (validate()) onNext();
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground">Business information</p>
        <p className="mt-1 text-xs text-foreground/50">
          This is what your customers and Meta will see for your WhatsApp Business account.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">* Business Name</label>
        <input
          type="text"
          value={value.businessName}
          onChange={(e) => setField("businessName", e.target.value)}
          placeholder="Ayesha Boutique"
          className={inputClass(Boolean(errors.businessName))}
        />
        {errors.businessName && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.businessName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-foreground/70">* Business Category</label>
          <select
            value={value.category}
            onChange={(e) => setField("category", e.target.value)}
            className={`${inputClass(Boolean(errors.category))} bg-surface ${value.category ? "text-foreground" : "text-foreground/40"}`}
          >
            <option value="" disabled>
              Select a category
            </option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.category}</p>}
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground/70">* Country</label>
          <select
            value={value.country}
            onChange={(e) => {
              const country = e.target.value as CountryCode;
              onChange({ ...value, country, timezone: TIMEZONE_BY_COUNTRY[country] });
            }}
            className="mt-1.5 w-full rounded-lg border border-ink/[.12] bg-surface px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">Timezone</label>
        <input
          type="text"
          value={value.timezone}
          readOnly
          className="mt-1.5 w-full rounded-lg border border-ink/[.12] bg-ink/[.02] px-3.5 py-2.5 text-sm text-foreground/60"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">* Support Email</label>
        <input
          type="email"
          value={value.supportEmail}
          onChange={(e) => setField("supportEmail", e.target.value)}
          placeholder="support@yourbusiness.com"
          className={inputClass(Boolean(errors.supportEmail))}
        />
        {errors.supportEmail && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.supportEmail}</p>}
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">* Business Phone</label>
        <div className="mt-1.5 flex gap-2">
          <span className="flex w-16 shrink-0 items-center justify-center rounded-lg border border-ink/[.12] bg-ink/[.02] text-sm text-foreground/60">
            {COUNTRIES.find((c) => c.code === value.country)?.dial}
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={value.businessPhone}
            onChange={(e) => setField("businessPhone", e.target.value)}
            placeholder={PHONE_PLACEHOLDER[value.country]}
            className={`flex-1 rounded-lg border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
              errors.businessPhone ? "border-red-400 dark:border-red-500/50" : "border-ink/[.12]"
            }`}
          />
        </div>
        {errors.businessPhone && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.businessPhone}</p>}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        className="mt-2 w-full rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        Continue
      </button>
    </div>
  );
}
