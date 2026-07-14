import type { Metadata } from "next";
import DocsPage from "@/views/DocsPage";

export const metadata: Metadata = {
  title: "Documentation — Exofe",
  description: "Set up WhatsApp, your catalog, and the AI assistant with Exofe.",
};

export default function Page() {
  return <DocsPage />;
}
