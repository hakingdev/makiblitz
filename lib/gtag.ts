/**
 * Google Ads tag (gtag.js), consent-gated exactly like the Meta Pixel
 * (lib/fbpixel.ts): nothing is queued, loaded or sent before "Alle
 * akzeptieren" — components/analytics/GoogleAds.tsx only calls `initGtag`
 * and injects the script once consent is "all".
 *
 * Purpose is conversion measurement only: ad_personalization (remarketing)
 * stays denied, and no PII or reservation details are ever passed.
 */

// Public IDs (they appear in the page source anyway). The env vars only let
// local tests use fake IDs so no real hits reach the Ads account.
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "AW-11384333898";

/** Conversion action "makilove бронь" — fired on /reservieren/bestaetigt. */
export const GOOGLE_ADS_RESERVATION =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_RESERVATION || "AW-11384333898/nq7lCLDigaAdEMrMvLQq";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Queue + consent + config, once. gtag.js processes the queue whenever it
 * finishes loading, so events pushed before that are not lost.
 */
export function initGtag(): void {
  if (typeof window === "undefined" || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the Arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
}

export function gtagEvent(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
