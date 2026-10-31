"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { initTiktok, sendTiktokServerEvent, tiktokEventId, tiktokTrack } from "@/lib/tiktok";

/**
 * TikTok "CompleteRegistration" on /reservieren/bestaetigt — the main TikTok
 * ads metric. Fired once per reservation (sessionStorage keyed by its id,
 * like the Meta Schedule event), only with consent "all": by the pixel and,
 * under the same event_id, by our server via the Events API, so a blocked
 * pixel still counts and TikTok keeps one of the two.
 */

const SESSION_KEY = "ml_tiktok_creg";

export function TikTokConversion({ reservationId }: { reservationId?: string }) {
  const { choice, hydrated } = useConsent();

  useEffect(() => {
    if (!hydrated || choice !== "all" || !reservationId) return;

    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === reservationId) return;
      window.sessionStorage.setItem(SESSION_KEY, reservationId);
    } catch {
      // Storage unavailable: fire anyway rather than lose the conversion.
    }

    initTiktok();
    tiktokTrack("CompleteRegistration", { content_name: "makilove_reservation" }, tiktokEventId(reservationId));
    sendTiktokServerEvent(reservationId);
  }, [hydrated, choice, reservationId]);

  return null;
}
