import type { Metadata } from "next";
import ConversationsPage from "@/views/dashboard/ConversationsPage";

export const metadata: Metadata = {
  title: "Conversations — Exofe",
};

export default function Page() {
  return <ConversationsPage />;
}
