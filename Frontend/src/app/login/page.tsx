import type { Metadata } from "next";
import LoginPage from "@/pages/LoginPage";

export const metadata: Metadata = {
  title: "Log in — Exofe",
  description: "Log in to your Exofe account.",
};

export default function Page() {
  return <LoginPage />;
}
