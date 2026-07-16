// Trial status shape (now backed by GET /billing/trial-status) and the
// onboarding checklist for the dashboard's "Setup guide" widget.
//
// Business rule from the PRD: every new signup gets a 7 day free trial.
// Once trialLengthDays is used up and no plan is picked, isExpired flips
// to true and the dashboard shows a lock screen until the user picks a
// plan from Billing.

import type { OnboardingStatus } from "@/lib/api";

export type TrialStatus = {
  isTrialing: boolean;
  daysLeft: number;
  trialLengthDays: number;
  isExpired: boolean;
  currentPlan: "trial" | "starter" | "growth" | "business";
};

export type OnboardingTask = {
  id: string;
  label: string;
  href: string;
  completed: boolean;
};

const ONBOARDING_STEPS: { id: string; label: string; href: string; key: keyof OnboardingStatus }[] = [
  { id: "connect-whatsapp", label: "Connect your WhatsApp number", href: "/dashboard/integrations", key: "whatsappConnected" },
  { id: "add-product", label: "Add your first product", href: "/dashboard/products", key: "hasProducts" },
  { id: "billing-details", label: "Add your billing details", href: "/dashboard/billing", key: "hasPaidPlan" },
  { id: "invite-team", label: "Invite a team member (optional)", href: "/dashboard/team", key: "hasTeamMembers" },
];

// Merges the static checklist copy with the real per-business completion
// flags from GET /dashboard/onboarding — a step only gets its checkmark
// once it's actually true, not once someone visits the page.
export function buildOnboardingTasks(status: OnboardingStatus | null): OnboardingTask[] {
  return ONBOARDING_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    href: step.href,
    completed: status ? status[step.key] : false,
  }));
}
