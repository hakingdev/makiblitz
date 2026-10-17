"use client";

import { useEffect } from "react";
import { useConsent } from "@/lib/consent";
import { track } from "@/lib/fbpixel";

/**
 * Fires the Meta "Schedule" event ("Запись" in Events Manager) on
 * /reservieren/bestaetigt once a table has been booked. Keyed by the
 * reservation id in `sessionStorage`, so reloading the page or navigating
 * back to it never counts the same booking twice, while a second booking in
 * the same session still does. No guest data goes into the event.
 */

const SESSION_KEY = "ml_schedule";

export function ScheduleEvent({ reservationId }: { reservationId?: string }) {
  const { pixelReady } = useConsent();

  useEffect(() => {
    if (!reservationId || !pixelReady) return;

    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === reservationId) return;
      window.sessionStorage.setItem(SESSION_KEY, reservationId);
    } catch {
      // Storage unavailable: fire anyway rather than lose the conversion.
    }

    track("Schedule", {
      content_name: "makilove_reservation",
      content_category: "reservation",
    });
  }, [reservationId, pixelReady]);

  return null;
}
