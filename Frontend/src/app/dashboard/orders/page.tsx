import { Package } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<Package className="h-6 w-6" strokeWidth={2} />}
      title="Orders"
      description="Track new, processing, shipped, delivered, and cancelled orders in one place."
    />
  );
}
