import { ScrollText } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<ScrollText className="h-6 w-6" strokeWidth={2} />}
      title="Logs"
      description="Admin actions, system errors, and webhook failures, for debugging and audit."
    />
  );
}
