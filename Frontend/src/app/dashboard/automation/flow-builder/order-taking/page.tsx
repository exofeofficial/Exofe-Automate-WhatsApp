"use client";

import dynamic from "next/dynamic";

// React Flow needs real DOM measurement (ResizeObserver, window) from the
// very first render — if Next.js server-renders it first and hydrates
// after, the diagram silently never recovers. ssr: false skips that
// first pass entirely so it only ever mounts client-side.
const OrderTakingFlowPage = dynamic(() => import("@/views/dashboard/automation/OrderTakingFlowPage"), { ssr: false });

export default function Page() {
  return <OrderTakingFlowPage />;
}
