"use client";

import { useEffect, useState } from "react";
import { Building2, Clock, CreditCard, Globe, Loader2, Percent, Truck, Code2 } from "lucide-react";
import { getSettings, type BusinessHourRow, type Settings } from "@/lib/api";
import BusinessProfileSection from "@/components/dashboard/settings/BusinessProfileSection";
import BusinessHoursSection from "@/components/dashboard/settings/BusinessHoursSection";
import DeliverySection from "@/components/dashboard/settings/DeliverySection";
import TaxSection from "@/components/dashboard/settings/TaxSection";
import PaymentSection from "@/components/dashboard/settings/PaymentSection";
import LanguageSection from "@/components/dashboard/settings/LanguageSection";
import DevelopersSection from "@/components/dashboard/settings/DevelopersSection";

const DAYS: BusinessHourRow["day"][] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DEFAULT_SETTINGS: Settings = {
  profile: { businessName: "", category: "", description: "", supportEmail: "", supportPhone: "", logo: null },
  hours: DAYS.map((day) => ({ day, open: "09:00", close: "18:00", closed: false })),
  delivery: { areas: "", charge: 0, estimatedTime: "", cashOnDelivery: true, pickupAvailable: false },
  tax: { taxName: "", taxRate: 0, pricesIncludeTax: false },
  payment: { onlinePaymentDetails: "" },
  language: "en",
};

const TABS = [
  { id: "profile", label: "Business Profile", icon: Building2 },
  { id: "hours", label: "Business Hours", icon: Clock },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "tax", label: "Taxes", icon: Percent },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "language", label: "Language", icon: Globe },
  { id: "developers", label: "Developers", icon: Code2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("profile");

  // Backend developer: this is a real GET /settings call (see src/lib/api.ts),
  // it will fail until that endpoint exists, which is expected, the page
  // just falls back to sensible defaults rather than showing fake data.
  useEffect(() => {
    getSettings()
      .then((res) => setSettings(res.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <nav className="flex gap-1.5 overflow-x-auto rounded-2xl border border-ink/[.06] bg-surface p-2 lg:w-56 lg:shrink-0 lg:flex-col lg:gap-0.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-indigo-50 dark:bg-indigo-500/15 text-[#45157b]" : "text-foreground/60 hover:bg-ink/[.03]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {tab === "profile" && (
          <BusinessProfileSection
            initial={settings.profile}
            onSaved={(profile) => setSettings((s) => ({ ...s, profile }))}
          />
        )}
        {tab === "hours" && (
          <BusinessHoursSection initial={settings.hours} onSaved={(hours) => setSettings((s) => ({ ...s, hours }))} />
        )}
        {tab === "delivery" && (
          <DeliverySection initial={settings.delivery} onSaved={(delivery) => setSettings((s) => ({ ...s, delivery }))} />
        )}
        {tab === "tax" && <TaxSection initial={settings.tax} onSaved={(tax) => setSettings((s) => ({ ...s, tax }))} />}
        {tab === "payment" && (
          <PaymentSection initial={settings.payment} onSaved={(payment) => setSettings((s) => ({ ...s, payment }))} />
        )}
        {tab === "language" && (
          <LanguageSection initial={settings.language} onSaved={(language) => setSettings((s) => ({ ...s, language }))} />
        )}
        {tab === "developers" && <DevelopersSection />}
      </div>
    </div>
  );
}
