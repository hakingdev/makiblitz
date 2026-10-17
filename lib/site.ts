export const SITE_URL = "https://www.makilove.de";

/**
 * Absolute base URL for links embedded in e-mails (confirm/unsubscribe).
 * Priority: SITE_URL env override → request origin in dev → production domain.
 */
export function getBaseUrl(devOrigin?: string): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development" && devOrigin) return devOrigin;
  return SITE_URL;
}

/** Instagram profile for the footer link — the link stays hidden while empty. */
export const INSTAGRAM_URL = "";

const ADDRESS_QUERY = "Kurhausstraße 11A, 97688 Bad Kissingen";

export type TravelMode = "driving" | "walking" | "transit";

/** Google Maps directions to the restaurant (opens the Maps app on phones). */
export function routeUrl(mode?: TravelMode): string {
  const params = new URLSearchParams({ api: "1", destination: ADDRESS_QUERY });
  if (mode) params.set("travelmode", mode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export const MAPS_URL = routeUrl();

/**
 * Keyless Google Maps embed (the target of maps.google.com/…&output=embed —
 * linked directly to skip the redirect). Loaded only after the visitor's
 * click, see components/contact/DirectionsMap.tsx; allowed by frame-src.
 */
export const MAPS_EMBED_URL =
  "https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1sKurhausstra%C3%9Fe+11A,+97688+Bad+Kissingen!6i17!3m1!1sde!5m1!1sde";
