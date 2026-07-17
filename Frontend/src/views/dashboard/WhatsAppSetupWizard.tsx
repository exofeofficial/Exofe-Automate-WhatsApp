"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { setWhatsAppConnected } from "@/lib/whatsapp";
import WizardProgress from "@/components/dashboard/whatsapp-setup/WizardProgress";
import Step1BusinessInfo from "@/components/dashboard/whatsapp-setup/Step1BusinessInfo";
import Step2Connect from "@/components/dashboard/whatsapp-setup/Step2Connect";
import Step3Verification from "@/components/dashboard/whatsapp-setup/Step3Verification";
import Step4AISetup from "@/components/dashboard/whatsapp-setup/Step4AISetup";
import StepComplete from "@/components/dashboard/whatsapp-setup/StepComplete";
import {
  EMPTY_BUSINESS_INFO,
  EMPTY_CREDENTIALS,
  type BusinessInfo,
  type WhatsAppCredentials,
} from "@/components/dashboard/whatsapp-setup/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function WhatsAppSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(EMPTY_BUSINESS_INFO);
  const [credentials, setCredentials] = useState<WhatsAppCredentials>(EMPTY_CREDENTIALS);
  const [aiDescription, setAiDescription] = useState("");

  const businessNumber = `${COUNTRIES.find((c) => c.code === businessInfo.country)?.dial ?? ""} ${businessInfo.businessPhone}`.trim();

  const handleFinish = () => {
    setWhatsAppConnected(businessNumber);
    setStep(5);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {step < 5 && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Connect WhatsApp</p>
            <p className="text-xs text-foreground/45">Step {step} of 4</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard/integrations")}
            aria-label="Cancel setup"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 hover:bg-ink/[.04] hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {step < 5 && <WizardProgress current={step} />}

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
              <Step1BusinessInfo value={businessInfo} onChange={setBusinessInfo} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <Step2Connect
                credentials={credentials}
                onCredentialsChange={setCredentials}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && <Step3Verification onNext={() => setStep(4)} onBack={() => setStep(2)} />}
            {step === 4 && (
              <Step4AISetup
                description={aiDescription}
                onChange={setAiDescription}
                onNext={handleFinish}
                onBack={() => setStep(3)}
              />
            )}
            {step === 5 && <StepComplete businessNumber={businessNumber} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
