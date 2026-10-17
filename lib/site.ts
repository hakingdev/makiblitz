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

const ADDRESS_QUERY = "Kurhausstr. 11A, 97688 Bad Kissingen";

/** Google Maps with directions to the restaurant (opens the Maps app on phones). */
export const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS_QUERY)}`;
