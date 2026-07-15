// Trial status shape (now backed by GET /billing/trial-status, see
// src/lib/api.ts) and the onboarding checklist for the dashboard.
//
// For backend developer: MOCK_ONBOARDING_TASKS is still a stand-in.
// Replace it with a fetch once there's an endpoint to track which setup
// steps a business has completed.
//
// Business rule from the PRD: every new signup gets a 7 day free trial.
// Once trialLengthDays is used up and no plan is picked, isExpired flips
// to true and the dashboard shows a lock screen until the user picks a
// plan from Billing.

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

export const MOCK_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: "connect-whatsapp", label: "Connect your WhatsApp number", href: "/dashboard/integrations", completed: false },
  { id: "add-product", label: "Add your first product", href: "/dashboard/products", completed: false },
  { id: "billing-details", label: "Add your billing details", href: "/dashboard/billing", completed: false },
  { id: "invite-team", label: "Invite a team member (optional)", href: "/dashboard/team", completed: false },
];
