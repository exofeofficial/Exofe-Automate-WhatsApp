import { LayoutTemplate } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<LayoutTemplate className="h-6 w-6" strokeWidth={2} />}
      title="Templates"
      description="Ready made WhatsApp message templates you can reuse across automations."
    />
  );
}
