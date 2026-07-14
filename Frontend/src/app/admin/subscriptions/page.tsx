import { CreditCard } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<CreditCard className="h-6 w-6" strokeWidth={2} />}
      title="Subscriptions"
      description="Who's on trial, who's paying, who's overdue, and plan upgrades or downgrades."
    />
  );
}
