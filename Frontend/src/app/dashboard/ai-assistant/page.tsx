import { Bot } from "lucide-react";
import ComingSoon from "@/components/dashboard/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      icon={<Bot className="h-6 w-6" strokeWidth={2} />}
      title="AI Assistant"
      description="Customize your business prompt, FAQs, response tone, and working hours."
    />
  );
}
