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
