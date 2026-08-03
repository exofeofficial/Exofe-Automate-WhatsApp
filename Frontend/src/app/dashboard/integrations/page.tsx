import { Suspense } from "react";
import IntegrationsPage from "@/views/dashboard/IntegrationsPage";

export default function Page() {
  return (
    <Suspense>
      <IntegrationsPage />
    </Suspense>
  );
}
