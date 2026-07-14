import { Users } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<Users className="h-6 w-6" strokeWidth={2} />}
      title="Customers"
      description="See order history, total spend, and notes for every customer who messages you."
    />
  );
}
