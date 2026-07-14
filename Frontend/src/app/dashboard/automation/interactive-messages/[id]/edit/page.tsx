import InteractiveMessageWizard from "@/views/dashboard/automation/InteractiveMessageWizard";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InteractiveMessageWizard messageId={id} />;
}
