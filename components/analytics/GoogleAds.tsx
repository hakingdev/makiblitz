"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { GOOGLE_ADS_ID, gtagEvent, initGtag } from "@/lib/gtag";

/**
 * Loads the Google Ads tag on every page — only after "Alle akzeptieren",
 * like the Meta Pixel. Without consent there is no request to Google at all.
 * A revoked consent takes effect on the next page load.
 */
export function GoogleAds() {
  const { choice, hydrated } = useConsent();
  const pathname = usePathname();
  const enabled = hydrated && choice === "all";

  useEffect(() => {
    if (enabled) initGtag();
  }, [enabled]);

  // page_view on client-side route changes; `config` covered the first page.
  const prevPath = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    gtagEvent("page_view", { send_to: GOOGLE_ADS_ID });
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <Script
      id="google-ads"
      src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      strategy="afterInteractive"
    />
  );
}
