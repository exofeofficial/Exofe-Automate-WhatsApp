import type { CountryCode } from "@/lib/countries";

export type BusinessInfo = {
  businessName: string;
  category: string;
  country: CountryCode;
  timezone: string;
  supportEmail: string;
  businessPhone: string;
};

export type WhatsAppCredentials = {
  metaAppId: string;
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
};

export const EMPTY_BUSINESS_INFO: BusinessInfo = {
  businessName: "",
  category: "",
  country: "PK",
  timezone: "Asia/Karachi",
  supportEmail: "",
  businessPhone: "",
};

export const EMPTY_CREDENTIALS: WhatsAppCredentials = {
  metaAppId: "",
  businessAccountId: "",
  phoneNumberId: "",
  accessToken: "",
  webhookVerifyToken: "",
};

export const TIMEZONE_BY_COUNTRY: Record<CountryCode, string> = {
  PK: "Asia/Karachi",
  KR: "Asia/Seoul",
  AE: "Asia/Dubai",
};

export const BUSINESS_CATEGORIES = [
  "Fashion and Apparel",
  "Food and Beverage",
  "Electronics",
  "Beauty and Cosmetics",
  "Home and Living",
  "Grocery",
  "Services",
  "Other",
];
