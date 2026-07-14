import { Users } from "lucide-react";
import AdminComingSoon from "@/components/admin/AdminComingSoon";

export default function Page() {
  return (
    <AdminComingSoon
      icon={<Users className="h-6 w-6" strokeWidth={2} />}
      title="Users"
      description="Every business owner and staff member across all of Exofe, search, view, and manage accounts."
    />
  );
}
