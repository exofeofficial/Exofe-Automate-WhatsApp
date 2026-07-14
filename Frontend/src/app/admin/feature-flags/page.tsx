import { Flag } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<Flag className="h-6 w-6" strokeWidth={2} />}
      title="Feature Flags"
      description="Turn features on or off for specific businesses or the whole platform, without a deploy."
    />
  );
}
