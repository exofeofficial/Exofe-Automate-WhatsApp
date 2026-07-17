"use client";

import { useState } from "react";
import { ApiError, updateBusinessHours, type BusinessHourRow } from "@/lib/api";
import SettingsSectionCard from "./SettingsSectionCard";

const DAY_LABELS: Record<BusinessHourRow["day"], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export default function BusinessHoursSection({
  initial,
  onSaved,
}: {
  initial: BusinessHourRow[];
  onSaved: (hours: BusinessHourRow[]) => void;
}) {
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (day: BusinessHourRow["day"], patch: Partial<BusinessHourRow>) => {
    setRows((r) => r.map((row) => (row.day === day ? { ...row, ...patch } : row)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { hours } = await updateBusinessHours(rows);
      onSaved(hours);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your business hours right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Business Hours"
      description="The AI assistant lets customers know when you're closed."
      onSave={handleSave}
      saving={saving}
      saved={saved}
      error={error}
    >
      <div className="flex flex-col divide-y divide-ink/[.05] rounded-xl border border-ink/[.06]">
        {rows.map((row) => (
          <div key={row.day} className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-medium text-foreground/75 sm:w-24 sm:shrink-0">{DAY_LABELS[row.day]}</span>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-foreground/50">
                <input
                  type="checkbox"
                  checked={row.closed}
                  onChange={(e) => updateRow(row.day, { closed: e.target.checked })}
                  className="h-4 w-4 rounded border-ink/[.2] text-[#5B4FE9] focus:ring-[#5B4FE9]/30"
                />
                Closed
              </label>
              {!row.closed && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={row.open}
                    onChange={(e) => updateRow(row.day, { open: e.target.value })}
                    className="w-[124px] rounded-md border border-ink/[.12] px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                  />
                  <span className="text-xs text-foreground/35">to</span>
                  <input
                    type="time"
                    value={row.close}
                    onChange={(e) => updateRow(row.day, { close: e.target.value })}
                    className="w-[124px] rounded-md border border-ink/[.12] px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
