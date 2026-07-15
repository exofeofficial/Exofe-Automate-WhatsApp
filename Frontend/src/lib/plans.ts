// Shared plan catalog — used by the marketing Pricing section and the
// dashboard Billing page, so the two never drift out of sync.

export type PlanId = "starter" | "growth" | "business";

export type Plan = {
  id: PlanId;
  name: string;
  monthly: number;
  desc: string;
  popular: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthly: 2499,
    desc: "Home businesses & Instagram sellers.",
    popular: false,
    features: [
      "WhatsApp order automation",
      "Basic AI replies",
      "1,000 conversations/month",
      "Order notifications",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    monthly: 4999,
    desc: "Small brands, restaurants & clothing stores.",
    popular: true,
    features: [
      "Everything in Starter",
      "Unlimited products",
      "AI order taking",
      "Google Sheets integration",
      "Multiple team members",
      "5,000 conversations/month",
    ],
  },
  {
    id: "business",
    name: "Business",
    monthly: 9999,
    desc: "High order volume businesses.",
    popular: false,
    features: [
      "Everything in Growth",
      "Unlimited conversations",
      "Priority support",
      "Custom integrations",
      "Analytics dashboard",
      "API access",
    ],
  },
];

export function yearlyEquivalent(monthly: number) {
  // ~17% off (2 months free) when billed yearly
  return Math.round((monthly * 10) / 12 / 10) * 10;
}
