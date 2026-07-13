import { promises as dns } from "dns";

/**
 * Server-side deliverability check for the address domain: without a usable
 * MX record the double-opt-in mail can never arrive, so the typo is surfaced
 * to the user immediately instead of silently ending in "no mail arrived".
 *
 * Deliberately MX-only. RFC 5321 allows falling back to A/AAAA, but every
 * real-world mailbox provider publishes MX — in practice the fallback only
 * ever matched parked domains (12345@1235.com passed via the parking page's
 * wildcard A record).
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
    return mx.some((r) => r.exchange && r.exchange !== ".");
  } catch (err) {
    if (!isDefinitiveMiss(err)) throw err;
    return false;
  }
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
