/**
 * Lokaler Bot-Test ohne öffentlichen Webhook: holt Updates per getUpdates und
 * reicht sie an den lokalen Webhook weiter. Funktioniert nur, solange KEIN
 * Webhook gesetzt ist (Telegram erlaubt nur eins von beidem).
 *
 *   npm run dev                      # in einem Terminal
 *   npm run telegram:poll            # im zweiten (Standard: http://localhost:3000)
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
    const val = trimmed.slice(eq + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv(".env.local");

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
const target = `${(process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "")}/api/telegram/webhook`;

(async () => {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN fehlt in .env.local");
  const info = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
  if (info.result?.url) throw new Error(`Webhook ist gesetzt (${info.result.url}) — Polling geht nur ohne.`);
  console.log("Polling →", target);
  let offset = 0;
  for (;;) {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=30&offset=${offset}&allowed_updates=["message","callback_query"]`,
    );
    const data = (await res.json()) as { ok: boolean; result: { update_id: number }[] };
    for (const update of data.result ?? []) {
      offset = update.update_id + 1;
      const forwarded = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": secret },
        body: JSON.stringify(update),
      }).catch((error) => ({ status: String(error) }));
      console.log("update", update.update_id, "→", forwarded.status);
    }
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
