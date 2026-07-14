import type { Metadata } from "next";
import TermsPage from "@/views/TermsPage";

export const metadata: Metadata = {
  title: "Terms & Conditions — Exofe",
  description: "The terms that apply when you use Exofe.",
};

export default function Page() {
  return <TermsPage />;
}
