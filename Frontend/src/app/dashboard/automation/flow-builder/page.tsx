import { Workflow } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<Workflow className="h-6 w-6" strokeWidth={2} />}
      title="Flow Builder"
      description="Chain multiple messages and steps together into a full conversation flow."
    />
  );
}
