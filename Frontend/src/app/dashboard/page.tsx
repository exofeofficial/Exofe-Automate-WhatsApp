import type { Metadata } from "next";
import DashboardHome from "@/views/dashboard/DashboardHome";

export const metadata: Metadata = {
  title: "Dashboard — Exofe",
};

export default function Page() {
  return <DashboardHome />;
}
