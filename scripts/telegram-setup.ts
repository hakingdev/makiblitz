/**
 * Registers the Telegram webhook for a deployment. Liest .env.local
 * (TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET) — dieselben Werte müssen in
 * Vercel gesetzt sein.
 *
 *   npm run telegram:setup -- https://www.makilove.de   # Webhook setzen
 *   npm run telegram:setup                              # nur Status anzeigen
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
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const base = process.argv[2]?.replace(/\/+$/, "");

async function call(method: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { ok: boolean; result?: any; description?: string };
}

(async () => {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN fehlt in .env.local");
  const me = await call("getMe");
  console.log("Bot:", me.ok ? `@${me.result.username}` : me.description);

  if (base) {
    if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET fehlt in .env.local");
    const url = `${base}/api/telegram/webhook`;
    const set = await call("setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    console.log("setWebhook", url, "→", set.ok ? "ok" : set.description);
  }

  const commands = await call("setMyCommands", {
    commands: [
      { command: "plan", description: "Схема зала сейчас" },
      { command: "walkin", description: "Walk-in: посадить гостей" },
      { command: "list", description: "Брони и отмена" },
      { command: "menu", description: "Кнопки бота" },
      { command: "id", description: "Chat-ID этого чата" },
    ],
  });
  console.log("Befehle:", commands.ok ? "ok" : commands.description);

  const info = await call("getWebhookInfo");
  const w = info.result ?? {};
  console.log("Webhook:", w.url || "(keiner)");
  console.log("  pending updates:", w.pending_update_count ?? 0);
  if (w.last_error_message) console.log("  letzter Fehler:", w.last_error_message);
})().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
