/**
 * Mail-Selbsttest gegen die Brevo-API. Liest .env.local.
 *
 *   npm run mail:selftest            # Key prüfen + verifizierte Absender listen (read-only)
 *   npm run mail:selftest -- --send  # zusätzlich Testmail an MAIL_TO schicken
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(file: string) {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), file), "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv(".env.local");

const { BREVO_API_KEY, MAIL_FROM, MAIL_FROM_NAME, MAIL_TO } = process.env;

console.log("Mail-Konfiguration:");
console.log("  api-key:", BREVO_API_KEY ? `set (${BREVO_API_KEY.length} chars)` : "MISSING");
console.log("  from   :", MAIL_FROM, MAIL_FROM_NAME ? `(${MAIL_FROM_NAME})` : "");
console.log("  to     :", MAIL_TO);
console.log("");

if (!BREVO_API_KEY) {
  console.error("✗ BREVO_API_KEY fehlt — abgebrochen.");
  process.exit(1);
}

const headers = {
  "api-key": BREVO_API_KEY,
  accept: "application/json",
  "content-type": "application/json",
};

async function main() {
  // 1) Key gültig?
  process.stdout.write("→ GET /v3/account … ");
  const acct = await fetch("https://api.brevo.com/v3/account", { headers });
  if (!acct.ok) {
    console.log(`✗ HTTP ${acct.status}`);
    console.error("  ", await acct.text());
    process.exit(1);
  }
  const acctData = await acct.json();
  console.log(`✓ ${acctData.email} · ${acctData.companyName ?? ""}`);

  // 2) Darf MAIL_FROM senden? Gültig, wenn es ein aktiver Einzelabsender IST
  //    ODER seine Domain in Brevo authentifiziert+verifiziert ist.
  const from = (MAIL_FROM ?? "").toLowerCase();
  const fromDomain = from.split("@")[1] ?? "";

  process.stdout.write("→ GET /v3/senders … ");
  let senderOk = false;
  const senders = await fetch("https://api.brevo.com/v3/senders", { headers });
  if (senders.ok) {
    const list: Array<{ email: string; active: boolean }> =
      (await senders.json()).senders ?? [];
    console.log(`✓ ${list.length} Absender`);
    for (const s of list) {
      console.log(`    ${s.active ? "✓" : "✗"} ${s.email}`);
    }
    const match = list.find((s) => s.email.toLowerCase() === from);
    if (match?.active) senderOk = true;
  } else {
    console.log(`(übersprungen: HTTP ${senders.status})`);
  }

  process.stdout.write("→ GET /v3/senders/domains … ");
  let domainOk = false;
  const domains = await fetch("https://api.brevo.com/v3/senders/domains", { headers });
  if (domains.ok) {
    const list: Array<{ domain_name: string; authenticated: boolean; verified: boolean }> =
      (await domains.json()).domains ?? [];
    console.log(`✓ ${list.length} Domain(s)`);
    for (const d of list) {
      const good = d.authenticated && d.verified;
      console.log(`    ${good ? "✓" : "✗"} ${d.domain_name}`);
      if (good && d.domain_name.toLowerCase() === fromDomain) domainOk = true;
    }
  } else {
    console.log(`(übersprungen: HTTP ${domains.status})`);
  }

  if (senderOk) {
    console.log(`  ✓ ${MAIL_FROM} ist verifizierter Einzelabsender.`);
  } else if (domainOk) {
    console.log(`  ✓ Domain ${fromDomain} ist authentifiziert → ${MAIL_FROM} darf senden.`);
  } else {
    console.log(`  ⚠ ${MAIL_FROM} ist weder verifizierter Absender noch über eine authentifizierte Domain abgedeckt — Versand wird abgelehnt.`);
  }

  // 3) Optional: echte Testmail
  if (process.argv.includes("--send")) {
    process.stdout.write(`→ POST /v3/smtp/email an ${MAIL_TO} … `);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sender: MAIL_FROM_NAME
          ? { name: MAIL_FROM_NAME, email: MAIL_FROM }
          : { email: MAIL_FROM },
        to: [{ email: MAIL_TO }],
        subject: "MakiBlitz · Brevo-Test",
        textContent: "Wenn du das liest, funktioniert der Brevo-Versand. 🍣",
        htmlContent: "<p>Wenn du das liest, funktioniert der Brevo-Versand. 🍣</p>",
      }),
    });
    if (!res.ok) {
      console.log(`✗ HTTP ${res.status}`);
      console.error("  ", await res.text());
      process.exit(1);
    }
    console.log("✓ gesendet:", (await res.json()).messageId);
  }
}

main().catch((err) => {
  console.error("✗ Fehler:", err?.message ?? err);
  process.exit(1);
});
