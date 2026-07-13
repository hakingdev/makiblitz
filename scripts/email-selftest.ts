/**
 * Assertion suite for the multi-stage e-mail validator (no test framework in
 * this repo — plain tsx script, non-zero exit on failure):
 *
 *   npm run waitlist:email-selftest
 *
 * Covers every address from the acceptance tables for stages 1–2
 * (validateEmail) and the DNS-MX stage (checkMailDomain) with a *mocked*
 * resolver, including the fail-open-on-timeout case.
 */

import {
  validateEmail,
  DEFAULT_EMAIL_RULES,
} from "../lib/email/validate-email";
import { checkMailDomain, type MailDnsResolver } from "../lib/waitlist/email-dns";

let failures = 0;

function check(what: string, actual: unknown, expected: unknown) {
  if (actual === expected) return;
  failures += 1;
  console.error(
    `FAIL ${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

async function checkThrows(what: string, run: () => Promise<unknown>) {
  try {
    await run();
    failures += 1;
    console.error(`FAIL ${what}: expected it to throw, but it resolved`);
  } catch {
    /* expected */
  }
}

// ============================================================ stages 1–2 ====
// Acceptance table "must PASS" — normalized (lower-cased) address is returned.
const shouldPass: Array<[string, string]> = [
  ["anna.schmidt@gmail.com", "anna.schmidt@gmail.com"],
  ["info@mueller-catering.de", "info@mueller-catering.de"], // own domain
  ["hans-peter@firma-xyz.de", "hans-peter@firma-xyz.de"], // hyphens
  ["kunde+makiblitz@web.de", "kunde+makiblitz@web.de"], // +alias
  ["office@sushi.berlin", "office@sushi.berlin"], // non-standard TLD
  ["a.mueller@mail.firma.co.uk", "a.mueller@mail.firma.co.uk"], // sub + ccTLD
  ["  Info@Mueller-Catering.DE ", "info@mueller-catering.de"], // trim+lowercase
  ["li.wei@163.com", "li.wei@163.com"], // real numeric provider (allow-listed)
  // asdf@… is valid at stages 1–2; only the server MX stage rejects it.
  ["asdf@qwertzuiop-xyz123.de", "asdf@qwertzuiop-xyz123.de"],
];
for (const [input, expected] of shouldPass) {
  check(`validateEmail PASS ${input}`, validateEmail(input), expected);
}

// Acceptance table "must BLOCK" at stages 1–2 → null.
const shouldBlock: Array<[string, string]> = [
  ["1234@gmail.com", "numeric-only local-part"],
  ["1234578@123.com", "numeric-only local-part (+ numeric domain)"],
  ["x@gmail.com", "local-part shorter than 2"],
  ["test@mailinator.com", "disposable domain"],
  ["hi@sub.mailinator.com", "disposable sub-domain"],
  ["foo@bar", "no TLD"],
  ["foo bar@gmail.com", "space in local-part"],
];
for (const [input, why] of shouldBlock) {
  check(`validateEmail BLOCK ${input} (${why})`, validateEmail(input), null);
}

// Rules are individually switchable — turning a rule off lets the address pass.
check(
  "toggle rejectNumericLocalPart off",
  validateEmail("1234@gmail.com", {
    ...DEFAULT_EMAIL_RULES,
    rejectNumericLocalPart: false,
  }),
  "1234@gmail.com",
);
check(
  "toggle minLocalPartLength to 0",
  validateEmail("x@gmail.com", {
    ...DEFAULT_EMAIL_RULES,
    minLocalPartLength: 0,
  }),
  "x@gmail.com",
);
check(
  "toggle rejectDisposable off",
  validateEmail("test@mailinator.com", {
    ...DEFAULT_EMAIL_RULES,
    rejectDisposable: false,
  }),
  "test@mailinator.com",
);

check("non-string input", validateEmail(1234 as unknown), null);

// ========================================================== MX stage (3) ====
// A tiny fake resolver: MX table + A/AAAA table drive the outcome, no network.
function fakeResolver(
  mx: Record<string, { exchange: string; priority: number }[]>,
  a: Record<string, string[]> = {},
): MailDnsResolver {
  const miss = (code: string) => Object.assign(new Error(code), { code });
  return {
    resolveMx: async (host) => mx[host] ?? Promise.reject(miss("ENOTFOUND")),
    resolve4: async (host) => a[host] ?? Promise.reject(miss("ENODATA")),
    resolve6: async () => Promise.reject(miss("ENODATA")),
  };
}

async function runMxChecks() {
  // The production timeout timer is unref'd (it must never hold the process
  // open). The "fail-open on timeout" case below is therefore the only pending
  // handle while it waits — without a ref'd keepalive Node would exit early,
  // before the 20 ms timeout fires. Cleared in the finally below.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await runMxCheckBody();
  } finally {
    clearInterval(keepAlive);
  }
}

async function runMxCheckBody() {
  // Domain with a real MX resolving to a public IP → accepted.
  const good = fakeResolver(
    { "gmail.com": [{ exchange: "mx.gmail.com", priority: 10 }] },
    { "mx.gmail.com": ["142.250.1.27"] },
  );
  check(
    "MX present + public IP",
    await checkMailDomain("gmail.com", { resolver: good }),
    true,
  );

  // NXDOMAIN (no such domain) → rejected. This is asdf@qwertzuiop-xyz123.de.
  check(
    "MX NXDOMAIN",
    await checkMailDomain("qwertzuiop-xyz123.de", { resolver: fakeResolver({}) }),
    false,
  );

  // ENODATA (domain exists, no MX record) → rejected.
  const noMx: MailDnsResolver = {
    resolveMx: async () =>
      Promise.reject(Object.assign(new Error("ENODATA"), { code: "ENODATA" })),
    resolve4: async () => [],
    resolve6: async () => [],
  };
  check("MX ENODATA", await checkMailDomain("no-mx.de", { resolver: noMx }), false);

  // MX exists but only resolves to loopback (parked-domain decoy) → rejected.
  const parked = fakeResolver(
    { "parked.de": [{ exchange: "mail.parked.de", priority: 10 }] },
    { "mail.parked.de": ["127.0.0.1"] },
  );
  check(
    "MX present but loopback only",
    await checkMailDomain("parked.de", { resolver: parked }),
    false,
  );

  // RFC 7505 null MX ("0 .") → rejected.
  const nullMx = fakeResolver({ "nomail.de": [{ exchange: ".", priority: 0 }] });
  check("null MX", await checkMailDomain("nomail.de", { resolver: nullMx }), false);

  // Fail-open on TIMEOUT: resolveMx never settles, tiny timeout, failOpen(default)
  // → must resolve true (a real user is never blocked by our DNS stalling).
  const hanging: MailDnsResolver = {
    resolveMx: () => new Promise(() => {}), // never resolves
    resolve4: async () => [],
    resolve6: async () => [],
  };
  check(
    "fail-open on timeout",
    await checkMailDomain("slow.de", { resolver: hanging, timeoutMs: 20 }),
    true,
  );

  // Fail-open on a generic network error (SERVFAIL) as well.
  const servfail: MailDnsResolver = {
    resolveMx: async () =>
      Promise.reject(Object.assign(new Error("ESERVFAIL"), { code: "ESERVFAIL" })),
    resolve4: async () => [],
    resolve6: async () => [],
  };
  check(
    "fail-open on SERVFAIL",
    await checkMailDomain("brokendns.de", { resolver: servfail }),
    true,
  );

  // With failOpen:false the same hiccup re-throws (used by the cache layer so
  // fail-open results are not memoized).
  await checkThrows("failOpen:false re-throws on timeout", () =>
    checkMailDomain("slow.de", {
      resolver: hanging,
      timeoutMs: 20,
      failOpen: false,
    }),
  );

  // Smoke-test the *default* resolver wiring (the mocks above supply their own
  // functions, so they cannot catch a broken default resolver — e.g. methods
  // left undefined). Real DNS is not available in every CI, so we tolerate
  // genuine network errors (they carry an `E…` code) and only fail on a
  // non-network throw (a TypeError from non-callable methods).
  try {
    await checkMailDomain("gmail.com", { failOpen: false, timeoutMs: 8000 });
    // Resolved → wiring is fine (DNS was reachable).
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    const isNetworkError = typeof code === "string" && code.startsWith("E");
    if (!isNetworkError) {
      failures += 1;
      console.error(
        `FAIL default resolver wiring: default resolver threw a non-network ` +
          `error (${(err as Error)?.name}: ${(err as Error)?.message}) — its ` +
          `dns methods are not callable.`,
      );
    }
    // else: no DNS in this environment — tolerated.
  }
}

// ----------------------------------------------------------------- done ----
runMxChecks()
  .then(() => {
    if (failures > 0) {
      console.error(`\n${failures} check(s) failed.`);
      process.exit(1);
    }
    console.log("All e-mail validation self-tests passed.");
  })
  .catch((err) => {
    console.error("Self-test crashed:", err);
    process.exit(1);
  });
