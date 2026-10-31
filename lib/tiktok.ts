/**
 * TikTok Pixel, consent-gated exactly like the Meta Pixel (lib/fbpixel.ts)
 * and the Google Ads tag (lib/gtag.ts): nothing is queued, loaded, stored or
 * sent before "Alle akzeptieren" — components/analytics/TikTokPixel.tsx only
 * calls `initTiktok` once consent is "all".
 *
 * The booking is counted twice under one `event_id` — by the pixel and by
 * the server (lib/tiktok-events.ts, Events API) — and TikTok keeps one.
 */

// Public ID (it appears in the page source anyway). The env var only lets
// local tests use a fake ID so no real hits reach the TikTok account.
export const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "D90ETQ3C77UEAKLA0OO0";

/** Shared by the pixel and the Events API, so TikTok deduplicates the booking. */
export function tiktokEventId(reservationId: string): string {
  return `reservation_${reservationId}`;
}

type Ttq = {
  page: () => void;
  track: (event: string, params?: Record<string, unknown>, options?: { event_id?: string }) => void;
};

declare global {
  interface Window {
    ttq?: Ttq;
    TiktokAnalyticsObject?: string;
  }
}

const SDK_URL = "https://analytics.tiktok.com/i18n/pixel/events.js";
const METHODS = [
  "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias",
  "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
];

type Queue = unknown[] & Record<string, unknown>;

function setAndDefer(target: Queue, method: string): void {
  target[method] = (...args: unknown[]) => target.push([method, ...args]);
}

/**
 * TikTok's base code (the `ttq` loader), once: a queue that events.js
 * processes when it has loaded, then `load` + `page` for our pixel.
 */
export function initTiktok(): void {
  if (typeof window === "undefined" || window.ttq) return;
  const ttq = [] as unknown as Queue;
  const instances: Record<string, Queue> = {};
  ttq.methods = METHODS;
  ttq.setAndDefer = setAndDefer;
  METHODS.forEach((method) => setAndDefer(ttq, method));
  ttq.instance = (id: string) => {
    const instance = instances[id] ?? ([] as unknown as Queue);
    METHODS.forEach((method) => setAndDefer(instance, method));
    return instance;
  };
  ttq._i = instances;
  ttq._t = {};
  ttq._o = {};
  ttq.load = (id: string, options?: Record<string, unknown>) => {
    instances[id] = Object.assign([], { _u: SDK_URL }) as unknown as Queue;
    (ttq._t as Record<string, number>)[id] = Date.now();
    (ttq._o as Record<string, unknown>)[id] = options ?? {};
    const script = document.createElement("script");
    script.async = true;
    script.src = `${SDK_URL}?sdkid=${encodeURIComponent(id)}&lib=ttq`;
    document.head.appendChild(script);
  };
  window.TiktokAnalyticsObject = "ttq";
  window.ttq = ttq as unknown as Ttq;
  (ttq.load as (id: string) => void)(TIKTOK_PIXEL_ID);
  window.ttq.page();
}

export function tiktokPage(): void {
  window.ttq?.page();
}

export function tiktokTrack(event: string, params: Record<string, unknown>, eventId: string): void {
  window.ttq?.track(event, params, { event_id: eventId });
}

// --- ttclid (TikTok's click id in the ad's landing URL) ----------------------

const TTCLID_KEY = "ml_ttclid";
/** TikTok's default click-through attribution window. */
const TTCLID_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The landing URL's ttclid — held in memory only, until consent allows storing it. */
let landingTtclid: string | null = null;

/** Reads the ttclid of the landing URL (no storage, no request). */
export function captureTtclid(): void {
  const value = new URLSearchParams(window.location.search).get("ttclid");
  if (value && value.length <= 1000) landingTtclid = value;
}

/** With consent: keeps the landing ttclid for the booking's server event; drops an expired one. */
export function storeTtclid(): void {
  try {
    if (landingTtclid) {
      window.localStorage.setItem(TTCLID_KEY, JSON.stringify({ value: landingTtclid, at: Date.now() }));
    } else if (!storedTtclid()) {
      window.localStorage.removeItem(TTCLID_KEY);
    }
  } catch {
    // Storage blocked: the server event goes without the click id.
  }
}

/** Consent withdrawn ("Nur notwendige"): drop the stored click id. */
export function forgetTtclid(): void {
  landingTtclid = null;
  try {
    window.localStorage.removeItem(TTCLID_KEY);
  } catch {
    // Nothing stored then either.
  }
}

function storedTtclid(): string | null {
  try {
    const stored = JSON.parse(window.localStorage.getItem(TTCLID_KEY) ?? "null") as { value?: unknown; at?: unknown } | null;
    if (typeof stored?.value !== "string" || typeof stored.at !== "number") return null;
    return Date.now() - stored.at < TTCLID_TTL_MS ? stored.value : null;
  } catch {
    return null;
  }
}

function cookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Asks our server to send the booking to the TikTok Events API (only called
 * with consent). Just the reservation id and TikTok's own ids go along — the
 * server reads the guest's contact data from the reservation itself.
 */
export function sendTiktokServerEvent(reservationId: string): void {
  void fetch("/api/tiktok-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      reservationId,
      ttclid: storedTtclid(),
      ttp: cookie("_ttp"),
      url: window.location.href,
      referrer: document.referrer || null,
    }),
  }).catch(() => undefined);
}
