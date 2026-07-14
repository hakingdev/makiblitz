"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { track } from "@/lib/fbpixel";

/**
 * Fires the Meta "Lead" event on /danke — but only for a genuine submission.
 *
 * The form sets a one-shot `sessionStorage` flag right before redirecting here.
 * We fire once, then clear the flag, so a direct visit, a reload or a
 * back-navigation to /danke never produces a phantom conversion. Firing waits
 * for the pixel to be ready, which keeps the event intact even when consent is
 * granted on this very page.
 */

const FLAG = "mb_lead";

export function LeadEvent() {
  const { pixelReady } = useConsent();

  useEffect(() => {
    if (!pixelReady) return;

    let hasFlag = false;
    try {
      hasFlag = window.sessionStorage.getItem(FLAG) === "1";
      if (hasFlag) window.sessionStorage.removeItem(FLAG);
    } catch {
      return;
    }
    if (!hasFlag) return;

    track("Lead", {
      content_name: "makilove_waitlist",
      content_category: "coming_soon",
    });
  }, [pixelReady]);

  return null;
}
