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
 * Having an MX is not enough either: parked domains publish decoys like
 * "0 localhost." (123456.de) or MX hosts resolving to loopback/private IPs.
 * At least one MX host must resolve to a publicly routable address.
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

function isPubliclyRoutable(addr: string): boolean {
  if (addr.includes(".") && !addr.includes(":")) {
    const octets = addr.split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return false;
    const [a, b] = octets as [number, number, number, number];
    return !(
      a === 0 || // 0.0.0.0/8
      a === 10 || // RFC 1918
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64/10
      (a === 169 && b === 254) || // link-local
      (a === 172 && b >= 16 && b <= 31) || // RFC 1918
      (a === 192 && b === 168) || // RFC 1918
      a >= 240 // reserved + broadcast
    );
  }
  const v6 = addr.toLowerCase();
  return !(
    v6 === "::" ||
    v6 === "::1" ||
    v6.startsWith("fc") || // ULA fc00::/7
    v6.startsWith("fd") ||
    v6.startsWith("fe8") || // link-local fe80::/10
    v6.startsWith("fe9") ||
    v6.startsWith("fea") ||
    v6.startsWith("feb") ||
    v6.startsWith("ff") // multicast
  );
}

/** True when the MX host has at least one publicly routable address. */
async function exchangeIsReachable(host: string): Promise<boolean> {
  if (host === "localhost" || host.endsWith(".localhost")) return false;

  for (const resolve of [dns.resolve4, dns.resolve6]) {
    try {
      if ((await withTimeout(resolve(host))).some(isPubliclyRoutable)) {
        return true;
      }
    } catch (err) {
      if (!isDefinitiveMiss(err)) throw err; // infra error → fail open upstream
    }
  }
  return false;
}

async function domainAcceptsMail(domain: string): Promise<boolean> {
  let mx;
  try {
    mx = await withTimeout(dns.resolveMx(domain));
  } catch (err) {
    if (!isDefinitiveMiss(err)) throw err;
    return false; // no MX published at all
  }

  // RFC 7505 null MX ("0 .") explicitly announces "no mail accepted".
  const hosts = mx
    .map((r) => (r.exchange ?? "").toLowerCase().replace(/\.$/, ""))
    .filter((h) => h !== "");

  // Best-priority hosts first; cap the lookups so a decoy list of dead
  // exchanges cannot stall the request (real providers resolve on the first).
  const byPriority = new Map(hosts.map((h, i) => [h, mx[i]!.priority] as const));
  const candidates = [...new Set(hosts)]
    .sort((a, b) => (byPriority.get(a) ?? 0) - (byPriority.get(b) ?? 0))
    .slice(0, 3);

  for (const host of candidates) {
    if (await exchangeIsReachable(host)) return true;
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
