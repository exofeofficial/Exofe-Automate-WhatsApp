"use client";

import dynamic from "next/dynamic";

// Same reasoning as the order-taking route: React Flow needs real DOM
// measurement from the very first render, so this only ever mounts
// client-side.
const MessageFlowPage = dynamic(() => import("@/views/dashboard/automation/MessageFlowPage"), { ssr: false });

export default function MessageFlowPageClient({ id }: { id: string }) {
  return <MessageFlowPage messageId={id} />;
}
