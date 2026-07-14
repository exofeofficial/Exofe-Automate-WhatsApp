// Trial status and onboarding checklist for the dashboard.
//
// For backend developer: this whole file is a stand-in for real data.
// Replace MOCK_TRIAL_STATUS and MOCK_ONBOARDING_TASKS with a fetch to
// something like GET /billing/trial-status once that endpoint exists
// (see API_CONTRACT.md). The shape below is what the dashboard UI expects,
// so keep the response matching TrialStatus and OnboardingTask.
//
// Business rule from the PRD: every new signup gets a 7 day free trial.
// Once trialLengthDays is used up and no plan is picked, isExpired should
// flip to true and the dashboard shows a lock screen until the user picks
// a plan from Billing.

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

// A brand new account, day one of the trial, nothing set up yet.
export const MOCK_TRIAL_STATUS: TrialStatus = {
  isTrialing: true,
  daysLeft: 7,
  trialLengthDays: 7,
  isExpired: false,
  currentPlan: "trial",
};

export const MOCK_ONBOARDING_TASKS: OnboardingTask[] = [
  { id: "connect-whatsapp", label: "Connect your WhatsApp number", href: "/dashboard/integrations", completed: false },
  { id: "add-product", label: "Add your first product", href: "/dashboard/products", completed: false },
  { id: "billing-details", label: "Add your billing details", href: "/dashboard/billing", completed: false },
  { id: "invite-team", label: "Invite a team member (optional)", href: "/dashboard/team", completed: false },
];
