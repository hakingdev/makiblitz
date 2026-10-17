"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { GOOGLE_ADS_RESERVATION, gtagEvent, initGtag } from "@/lib/gtag";

/**
 * Google Ads conversion "makilove бронь" on /reservieren/bestaetigt — once per
 * reservation (sessionStorage keyed by its id, like the Meta Schedule event),
 * only with consent "all". No guest data goes into the event.
 */

const SESSION_KEY = "ml_ads_conversion";

export function GoogleAdsConversion({ reservationId }: { reservationId?: string }) {
  const { choice, hydrated } = useConsent();

  useEffect(() => {
    if (!hydrated || choice !== "all" || !reservationId) return;

    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === reservationId) return;
      window.sessionStorage.setItem(SESSION_KEY, reservationId);
    } catch {
      // Storage unavailable: fire anyway rather than lose the conversion.
    }

    initGtag();
    gtagEvent("conversion", { send_to: GOOGLE_ADS_RESERVATION });
  }, [hydrated, choice, reservationId]);

  return null;
}
