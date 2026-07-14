import { CreditCard } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<CreditCard className="h-6 w-6" strokeWidth={2} />}
      title="Billing"
      description="Manage your current plan, upgrade, and view payment history and invoices."
    />
  );
}
