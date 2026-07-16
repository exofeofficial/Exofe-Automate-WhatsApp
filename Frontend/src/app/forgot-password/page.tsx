import type { Metadata } from "next";
import ForgotPasswordPage from "@/views/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Reset your password — Exofe",
  description: "Reset your Exofe account password.",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
