// markets we actually operate in used by both the signup and demo forms,
// keep this the single source of truth so they don't drift apart
export const COUNTRIES = [
  { code: "PK" as const, dial: "+92", label: "Pakistan", flag: "🇵🇰", minDigits: 10, maxDigits: 10 },
  { code: "KR" as const, dial: "+82", label: "South Korea", flag: "🇰🇷", minDigits: 9, maxDigits: 10 },
  { code: "AE" as const, dial: "+971", label: "UAE", flag: "🇦🇪", minDigits: 9, maxDigits: 9 },
];

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export const PHONE_PLACEHOLDER: Record<CountryCode, string> = {
  PK: "3XX XXXXXXX",
  KR: "10 XXXX XXXX",
  AE: "5X XXX XXXX",
};
