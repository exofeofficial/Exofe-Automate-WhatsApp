import type { Metadata } from "next";
import DataDeletionPage from "@/views/DataDeletionPage";

export const metadata: Metadata = {
  title: "Data Deletion — Exofe",
  description: "How to request deletion of your data from Exofe.",
};

export default function Page() {
  return <DataDeletionPage />;
}
