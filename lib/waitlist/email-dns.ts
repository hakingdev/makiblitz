import { promises as dns } from "dns";

/**
 * Stage 3 — server-only deliverability check for the address domain. Without a
 * usable MX record the double-opt-in mail can never arrive, so the typo is
 * surfaced to the user immediately instead of silently ending in "no mail
 * arrived".
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

const TIMEOUT_MS = 3000; // ~3 s — a real user must not wait longer on our DNS
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 h
const CACHE_MAX = 5000;

/**
 * The slice of node:dns/promises this module needs. Injectable so the MX stage
 * can be unit-tested with a fake resolver (no real network, no flakiness).
 */
export type MailDnsResolver = {
  resolveMx: (hostname: string) => Promise<{ exchange: string; priority: number }[]>;
  resolve4: (hostname: string) => Promise<string[]>;
  resolve6: (hostname: string) => Promise<string[]>;
};

// Arrow wrappers, not bare method references: dns.promises' methods must be
// invoked *on* the promises object. A detached `resolveMx: dns.resolveMx`
// throws when later called as `resolver.resolveMx(host)`, which would silently
// fail-open the whole MX stage.
const defaultResolver: MailDnsResolver = {
  resolveMx: (hostname) => dns.resolveMx(hostname),
  resolve4: (hostname) => dns.resolve4(hostname),
  resolve6: (hostname) => dns.resolve6(hostname),
};

const cache = new Map<string, { ok: boolean; expires: number }>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("DNS lookup timed out")),
      timeoutMs,
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
async function exchangeIsReachable(
  host: string,
  resolver: MailDnsResolver,
  timeoutMs: number,
): Promise<boolean> {
  if (host === "localhost" || host.endsWith(".localhost")) return false;

  for (const resolve of [resolver.resolve4, resolver.resolve6]) {
    try {
      if ((await withTimeout(resolve(host), timeoutMs)).some(isPubliclyRoutable)) {
        return true;
      }
    } catch (err) {
      if (!isDefinitiveMiss(err)) throw err; // infra error → fail open upstream
    }
  }
  return false;
}

async function domainAcceptsMail(
  domain: string,
  resolver: MailDnsResolver,
  timeoutMs: number,
): Promise<boolean> {
  let mx;
  try {
    mx = await withTimeout(resolver.resolveMx(domain), timeoutMs);
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
    if (await exchangeIsReachable(host, resolver, timeoutMs)) return true;
  }
  return false;
}

/**
 * Core MX check for a single domain, without the module-level cache. Exposed
 * (and given an injectable resolver + explicit fail-open switch) so the stage
 * is unit-testable.
 *
 * Returns true when the domain plausibly accepts mail, false on a definitive
 * miss (no MX / NXDOMAIN / only unroutable exchanges). On a DNS hiccup
 * (timeout, SERVFAIL, …) it honours `failOpen`: default true resolves to true
 * (never punish a real user); false re-throws so a caller can decide.
 */
export async function checkMailDomain(
  domain: string,
  opts: {
    resolver?: MailDnsResolver;
    timeoutMs?: number;
    failOpen?: boolean;
  } = {},
): Promise<boolean> {
  const resolver = opts.resolver ?? defaultResolver;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const failOpen = opts.failOpen ?? true;
  try {
    return await domainAcceptsMail(domain, resolver, timeoutMs);
  } catch (err) {
    if (failOpen) return true;
    throw err;
  }
}

/** `email` must already be normalized (see lib/email/validate-email.ts). */
export async function hasValidMailDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  const hit = cache.get(domain);
  if (hit && hit.expires > Date.now()) return hit.ok;

  let ok: boolean;
  try {
    // failOpen:false here so a DNS hiccup stays *uncached* — the next
    // submission retries DNS instead of memoizing a fail-open "true".
    ok = await checkMailDomain(domain, { failOpen: false });
  } catch {
    return true; // fail-open, uncached
  }

  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(domain, { ok, expires: Date.now() + CACHE_TTL_MS });
  return ok;
}
