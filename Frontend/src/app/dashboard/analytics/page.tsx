import { BarChart3 } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<BarChart3 className="h-6 w-6" strokeWidth={2} />}
      title="Analytics"
      description="Orders and sales trends, best selling products, peak order times, and conversion rate."
    />
  );
}
