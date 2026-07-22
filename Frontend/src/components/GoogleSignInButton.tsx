"use client";

import { useEffect, useRef } from "react";
import { loadGoogleScript, type GoogleCredentialResponse } from "@/lib/google";

// Renders Google's own Sign-In button (via Google Identity Services) into
// a container we control the width/spacing of. Google owns the button's
// visuals on purpose — that's what keeps this flow trustworthy to users
// and reliable across browsers, a custom-styled button that fakes the
// click is a much easier thing to get subtly wrong.
export default function GoogleSignInButton({
  onCredential,
  text = "continue_with",
}: {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const container = containerRef.current;
    if (!clientId || !container) return;

    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !window.google || !container) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) => onCredentialRef.current(response.credential),
      });

      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text,
        width: container.offsetWidth || 320,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [text]);

  return <div ref={containerRef} className="flex w-full justify-center overflow-hidden [&>div]:!w-full" />;
}
