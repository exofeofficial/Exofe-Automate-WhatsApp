import type { Metadata } from "next";
import SignupPage from "@/views/SignupPage";

export const metadata: Metadata = {
  title: "Create your account — Exofe",
  description: "Start automating your WhatsApp orders with Exofe.",
};

export default function Page() {
  return <SignupPage />;
}
