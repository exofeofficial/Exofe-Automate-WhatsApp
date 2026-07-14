import { BarChart3 } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<BarChart3 className="h-6 w-6" strokeWidth={2} />}
      title="Analytics"
      description="Platform wide usage, signups, messages sent, and AI activity across every business."
    />
  );
}
