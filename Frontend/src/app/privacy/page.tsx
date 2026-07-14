import type { Metadata } from "next";
import PrivacyPolicyPage from "@/views/PrivacyPolicyPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Exofe",
  description: "How Exofe collects, uses, and protects your data.",
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
