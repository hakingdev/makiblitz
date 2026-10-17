import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { RegistrationEvent } from "@/components/analytics/RegistrationEvent";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

export const metadata: Metadata = {
  title: t.confirmPage.metaTitle,
  robots: { index: false, follow: false },
};

type ConfirmState = "success" | "already" | "expired" | "invalid";

function resolveState(value: string | undefined): ConfirmState {
  return value === "success" || value === "already" || value === "expired"
    ? value
    : "invalid";
}

/**
 * Landing page of the waitlist double-opt-in link (redirect target of
 * /api/confirm), kept for confirmation mails already sent. On success it is
 * still the Meta "CompleteRegistration" conversion point.
 */
export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const state = resolveState(searchParams.state);
  const copy = t.confirmPage[state];

  return (
    <LegalPageShell title={copy.title}>
      <RegistrationEvent active={state === "success"} />
      {copy.body && <p>{copy.body}</p>}
    </LegalPageShell>
  );
}
