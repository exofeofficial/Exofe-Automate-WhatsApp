"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import {
  ApiError,
  createInteractiveMessage,
  getInteractiveMessage,
  updateInteractiveMessage,
  type InteractiveButton,
  type InteractiveListRow,
  type InteractiveMessageKind,
  type InteractiveMessageTemplate,
  type InteractiveMessageTrigger,
} from "@/lib/api";
import AutomationWizardProgress from "@/components/dashboard/automation/AutomationWizardProgress";
import Step1TemplateChoice from "@/components/dashboard/automation/Step1TemplateChoice";
import Step2Describe from "@/components/dashboard/automation/Step2Describe";
import Step3Preview from "@/components/dashboard/automation/Step3Preview";
import Step4Trigger from "@/components/dashboard/automation/Step4Trigger";
import { TEMPLATE_META, generateFromPrompt, makeButton } from "@/components/dashboard/automation/interactiveMessageHelpers";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function InteractiveMessageWizard({ messageId }: { messageId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(messageId));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [template, setTemplate] = useState<InteractiveMessageTemplate | null>(null);
  const [prompt, setPrompt] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [kind, setKind] = useState<InteractiveMessageKind>("buttons");
  const [buttons, setButtons] = useState<InteractiveButton[]>([]);
  const [listButtonLabel, setListButtonLabel] = useState("View Options");
  const [listRows, setListRows] = useState<InteractiveListRow[]>([]);
  const [trigger, setTrigger] = useState<InteractiveMessageTrigger>("manual");

  useEffect(() => {
    if (!messageId) return;
    getInteractiveMessage(messageId)
      .then((res) => {
        const m = res.message;
        setTemplate(m.template);
        setPrompt(m.prompt);
        setBodyText(m.bodyText);
        setKind(m.kind);
        setButtons(m.buttons);
        setListButtonLabel(m.listButtonLabel);
        setListRows(m.listRows);
        setTrigger(m.trigger);
      })
      .catch(() => setSaveError("Couldn't load this automation right now."))
      .finally(() => setLoading(false));
  }, [messageId]);

  const handlePickTemplate = (t: InteractiveMessageTemplate) => {
    setTemplate(t);
    if (!bodyText.trim()) setBodyText(TEMPLATE_META[t].defaultBody);
    if (buttons.length === 0) setButtons(TEMPLATE_META[t].defaultButtons.slice(0, 3).map((text) => makeButton(text)));
  };

  const handleQuickGenerate = (quickPrompt: string) => {
    const result = generateFromPrompt(quickPrompt);
    setPrompt(quickPrompt);
    setTemplate(result.template);
    setBodyText(result.bodyText);
    setKind(result.kind);
    setButtons(result.buttons);
    setListButtonLabel(result.listButtonLabel);
    setListRows(result.listRows);
    setTrigger(result.trigger);
    setStep(3);
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      template,
      prompt,
      bodyText: bodyText.trim(),
      kind,
      buttons: buttons.filter((b) => b.text.trim()),
      listButtonLabel: listButtonLabel.trim() || "View Options",
      listRows: listRows.filter((r) => r.title.trim()),
      trigger,
      status: "active" as const,
    };
    try {
      if (messageId) {
        await updateInteractiveMessage(messageId, payload);
      } else {
        await createInteractiveMessage(payload);
      }
      router.push("/dashboard/automation/interactive-messages");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save this automation right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{messageId ? "Edit Interactive Message" : "Create Interactive Message"}</p>
          <p className="text-xs text-foreground/45">Step {step} of 4</p>
        </div>
        <Link
          href="/dashboard/automation/interactive-messages"
          aria-label="Cancel"
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 hover:bg-ink/[.04] hover:text-foreground"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>

      <AutomationWizardProgress current={step} />

      <div className="rounded-3xl border border-ink/[.06] bg-surface p-6 shadow-sm sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {step === 1 && (
              <Step1TemplateChoice
                template={template}
                onPick={handlePickTemplate}
                onNext={() => setStep(2)}
                onQuickGenerate={handleQuickGenerate}
              />
            )}
            {step === 2 && (
              <Step2Describe bodyText={bodyText} onChange={setBodyText} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <Step3Preview
                bodyText={bodyText}
                onBodyChange={setBodyText}
                kind={kind}
                onKindChange={setKind}
                buttons={buttons}
                onButtonsChange={setButtons}
                listButtonLabel={listButtonLabel}
                onListButtonLabelChange={setListButtonLabel}
                listRows={listRows}
                onListRowsChange={setListRows}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}
            {step === 4 && (
              <Step4Trigger
                trigger={trigger}
                onChange={setTrigger}
                onBack={() => setStep(3)}
                onSave={handleSave}
                saving={saving}
                error={saveError}
                isEdit={Boolean(messageId)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
