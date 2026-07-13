"use client";

import { getMessages } from "@/lib/i18n";
import { useConsent } from "@/lib/consent";

const t = getMessages();

/**
 * Footer entry point to re-open the consent banner and change/revoke the
 * choice (Art. 7 Abs. 3 DSGVO). Styled to sit alongside the footer's legal
 * links.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { openBanner } = useConsent();

  return (
    <button type="button" onClick={openBanner} className={className}>
      {t.consent.settingsLink}
    </button>
  );
}
