"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { track } from "@/lib/fbpixel";

/**
 * Fires the Meta "CompleteRegistration" event on /confirm once the double-opt-in
 * has succeeded (`active` = state "success"). A one-time key in `sessionStorage`
 * guards against duplicates from re-opening the confirmation link or reloading
 * the page within the same browser session. invalid/expired never fire.
 */

const SESSION_KEY = "mb_creg";

export function RegistrationEvent({ active }: { active: boolean }) {
  const { pixelReady } = useConsent();

  useEffect(() => {
    if (!active || !pixelReady) return;

    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage unavailable: fire anyway rather than lose the conversion.
    }

    track("CompleteRegistration", {
      content_name: "makilove_waitlist",
      content_category: "coming_soon",
    });
  }, [active, pixelReady]);

  return null;
}
