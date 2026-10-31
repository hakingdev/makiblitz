"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { captureTtclid, forgetTtclid, initTiktok, storeTtclid, tiktokPage } from "@/lib/tiktok";

/**
 * Loads the TikTok Pixel on every page — only after "Alle akzeptieren", like
 * the Meta Pixel and Google Ads. Without consent there is no request to
 * TikTok, no TikTok cookie and no stored click id (ttclid). A revoked consent
 * takes effect on the next page load.
 */
export function TikTokPixel() {
  const { choice, hydrated } = useConsent();
  const pathname = usePathname();
  const enabled = hydrated && choice === "all";

  // Read the ad's click id while the landing URL still carries it — so a
  // visitor who accepts a page later is still attributed. Memory only.
  useEffect(() => captureTtclid(), []);

  useEffect(() => {
    if (!hydrated) return;
    if (choice === "all") {
      initTiktok();
      storeTtclid();
    } else if (choice === "necessary") {
      forgetTtclid();
    }
  }, [hydrated, choice]);

  // page() on client-side route changes; initTiktok covered the first page.
  const prevPath = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    tiktokPage();
  }, [enabled, pathname]);

  return null;
}
