import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptInvitePage from "@/views/AcceptInvitePage";

export const metadata: Metadata = {
  title: "Accept Invite — Exofe",
  description: "Set up your account to join your team on Exofe.",
};

export default function Page() {
  return (
    <Suspense>
      <AcceptInvitePage />
    </Suspense>
  );
}
