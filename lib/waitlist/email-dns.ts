import { promises as dns } from "dns";

/**
 * Server-side deliverability check for the address domain: a domain that
 * publishes neither usable MX nor A/AAAA records can never receive the
 * double-opt-in mail, so the typo is surfaced to the user immediately
 * instead of silently ending in "no mail arrived".
 *
 * Fail-open by design: DNS hiccups (timeouts, SERVFAIL) must never block a
 * signup — only a definitive "domain/records do not exist" rejects.
 */

const TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 h
const CACHE_MAX = 5000;

const cache = new Map<string, { ok: boolean; expires: number }>();

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("DNS lookup timed out")),
      TIMEOUT_MS,
    );
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** ENOTFOUND / ENODATA = authoritative "no such records"; anything else is a lookup failure. */
function isDefinitiveMiss(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === "ENOTFOUND" || code === "ENODATA";
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    // RFC 7505 null MX ("0 .") explicitly announces "no mail accepted".
    const usable = mx.filter((r) => r.exchange && r.exchange !== ".");
    if (usable.length > 0) return true;
    if (mx.length > 0) return false; // null MX only
  } catch (err) {
    if (!isDefinitiveMiss(err)) throw err;
  }

  // No MX published — SMTP falls back to the A/AAAA record of the domain.
  for (const resolve of [dns.resolve4, dns.resolve6]) {
    try {
      if ((await withTimeout(resolve(domain))).length > 0) return true;
    } catch (err) {
      if (!isDefinitiveMiss(err)) throw err;
    }
  }

  return false;
}

/** `email` must already be normalized (see lib/waitlist/validate.ts). */
export async function hasValidMailDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  const hit = cache.get(domain);
  if (hit && hit.expires > Date.now()) return hit.ok;

  let ok: boolean;
  try {
    ok = await domainAcceptsMail(domain);
  } catch {
    return true; // fail-open, uncached — retry DNS on the next submission
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(domain, { ok, expires: Date.now() + CACHE_TTL_MS });
  return ok;
}
