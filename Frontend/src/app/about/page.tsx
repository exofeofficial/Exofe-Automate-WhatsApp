import type { Metadata } from "next";
import AboutPage from "@/views/AboutPage";

export const metadata: Metadata = {
  title: "About Us — Exofe",
  description: "Why we built Exofe and what we're working toward.",
};

export default function Page() {
  return <AboutPage />;
}
