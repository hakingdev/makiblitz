/**
 * Thin, consent-safe wrapper around the Meta (Facebook) Pixel.
 *
 * Every `fbq` call in the app goes through here. The helpers are no-ops when
 * the pixel isn't loaded — which is exactly the case when consent hasn't been
 * granted (the loader in components/analytics/FacebookPixel.tsx only injects
 * the snippet after "Alle akzeptieren") or when no Pixel ID is configured.
 *
 * No PII is ever passed to these helpers (no e-mail, phone or PLZ);
 * Advanced Matching stays off.
 */

// Inlined at build time. Undefined → the pixel never loads and every helper
// below is a no-op, so the site behaves exactly as before.
export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function ready(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.fbq === "function" &&
    !!FB_PIXEL_ID
  );
}

export function pageview(): void {
  if (!ready()) return;
  window.fbq!("track", "PageView");
}

export function track(event: string, params?: Record<string, unknown>): void {
  if (!ready()) return;
  window.fbq!("track", event, params);
}

/**
 * Fire a non-standard ("custom") Meta event — funnel micro-conversions like
 * FormStart / CTAClick that have no clean standard-event equivalent. Same
 * consent + Pixel-ID guard as `track`. To optimize ads for these, create a
 * Custom Conversion in Meta Events Manager based on the event name.
 */
export function trackCustom(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (!ready()) return;
  window.fbq!("trackCustom", event, params);
}
