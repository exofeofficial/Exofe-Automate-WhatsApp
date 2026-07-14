import { LifeBuoy } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<LifeBuoy className="h-6 w-6" strokeWidth={2} />}
      title="Support"
      description="Support requests and tickets from business owners, in one place."
    />
  );
}
