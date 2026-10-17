import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { getMessages } from "@/lib/i18n";

const t = getMessages();

export const metadata: Metadata = {
  title: t.unsubscribePage.metaTitle,
  robots: { index: false, follow: false },
};

/**
 * Landing page of the opt-out link (redirect target of /api/unsubscribe).
 * Kept for links in waitlist mails that are already in people's inboxes.
 */
export default function AbmeldenPage({
  searchParams,
}: {
  searchParams: { state?: string };
}) {
  const state = searchParams.state === "success" ? "success" : "invalid";
  const copy = t.unsubscribePage[state];

  return (
    <LegalPageShell title={copy.title}>
      <p>{copy.body.replace("{email}", t.contact.email)}</p>
    </LegalPageShell>
  );
}
