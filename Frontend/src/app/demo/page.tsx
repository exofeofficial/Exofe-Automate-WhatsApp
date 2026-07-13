import type { Metadata } from "next";
import DemoPage from "@/pages/DemoPage";

export const metadata: Metadata = {
  title: "Book a demo — Exofe",
  description: "See how Exofe helps you sell on WhatsApp more efficiently.",
};

export default function Page() {
  return <DemoPage />;
}
