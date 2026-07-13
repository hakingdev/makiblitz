"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent";
import { FB_PIXEL_ID, pageview } from "@/lib/fbpixel";

/**
 * Loads the Meta Pixel — but only after "Alle akzeptieren" and only if a Pixel
 * ID is configured. Without consent the snippet is never injected, so there is
 * not a single request to facebook/meta domains and no pixel cookie is set.
 *
 * A revoked consent ("all" → "necessary") takes effect on the next page load:
 * `choice` is then no longer "all", the snippet isn't rendered, `fbq` never
 * comes back.
 */
export function FacebookPixel() {
  const { choice, hydrated, setPixelReady } = useConsent();
  const pathname = usePathname();

  const enabled = hydrated && choice === "all" && !!FB_PIXEL_ID;

  // Signal readiness as soon as the `fbq` stub exists. Conversion trackers on
  // /danke and /confirm wait for this — so a consent granted *right there*
  // still fires its event once the pixel comes up.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window.fbq === "function") {
      setPixelReady(true);
      return;
    }
    let tries = 0;
    const id = window.setInterval(() => {
      if (typeof window.fbq === "function") {
        setPixelReady(true);
        window.clearInterval(id);
      } else if (++tries > 100) {
        // ~5s safety cap; the inline snippet defines `fbq` synchronously, so
        // this practically always resolves within a frame or two.
        window.clearInterval(id);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [enabled, setPixelReady]);

  // PageView on every client-side route change. The initial PageView is fired
  // by the inline snippet below, so skip the first observed pathname.
  const prevPath = useRef<string | null>(null);
  useEffect(() => {
    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    pageview();
  }, [pathname]);

  if (!enabled) return null;

  return (
    <Script id="fb-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FB_PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}
