import { Building2 } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<Building2 className="h-6 w-6" strokeWidth={2} />}
      title="Clients"
      description="Every business using Exofe, their plan, WhatsApp connection status, and account health."
    />
  );
}
