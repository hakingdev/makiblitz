/**
 * One-time / idempotent Twilio setup for guest messages. Reads .env.local
 * (TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET).
 *
 *   node --env-file=.env.local --import tsx scripts/twilio-setup.ts            # templates + profile
 *   node --env-file=.env.local --import tsx scripts/twilio-setup.ts --webhooks # + inbound/status URLs
 *
 * - creates the three WhatsApp templates (lib/messaging/templates.ts) if
 *   missing and submits them to Meta (category UTILITY); prints their SIDs
 *   and approval status — paste new SIDs into TEMPLATE_SIDS
 * - fills the business profile of the WhatsApp sender
 * - with --webhooks: points the sender's inbound and status callbacks at
 *   www.makilove.de (only once the endpoints are deployed)
 */
import { MANAGE_BASE, TEMPLATES, type TemplateKey } from "@/lib/messaging/templates";

const SITE = "https://www.makilove.de";
const SENDER = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+15553653044";
const { TWILIO_API_KEY_SID: key, TWILIO_API_KEY_SECRET: secret } = process.env;
if (!key || !secret) throw new Error("TWILIO_API_KEY_SID / TWILIO_API_KEY_SECRET fehlen in .env.local");
const auth = "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");

async function api(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function templates() {
  const existing = (await api("GET", "https://content.twilio.com/v1/Content?PageSize=50")).contents as any[];
  for (const [k, t] of Object.entries(TEMPLATES) as [TemplateKey, (typeof TEMPLATES)[TemplateKey]][]) {
    let content = existing.find((c) => c.friendly_name === t.name);
    if (!content) {
      const text = `${t.body}\n${MANAGE_BASE}{{${t.tokenVar}}}`;
      content = await api("POST", "https://content.twilio.com/v1/Content", {
        friendly_name: t.name,
        language: "de",
        variables: t.sample,
        types: {
          "twilio/call-to-action": {
            body: t.body,
            actions: [{ type: "URL", title: t.button, url: `${MANAGE_BASE}{{${t.tokenVar}}}` }],
          },
          "twilio/text": { body: text },
        },
      });
      console.log(`created ${k}: ${content.sid}`);
    }
    const approval = await api("GET", `https://content.twilio.com/v1/Content/${content.sid}/ApprovalRequests`);
    let status = approval.whatsapp?.status as string | undefined;
    if (!status || status === "unsubmitted") {
      const submitted = await api("POST", `https://content.twilio.com/v1/Content/${content.sid}/ApprovalRequests/whatsapp`, {
        name: t.name,
        category: "UTILITY",
      });
      status = submitted.status;
    }
    console.log(`${k.padEnd(13)} ${content.sid}  whatsapp: ${status}${approval.whatsapp?.rejection_reason ? ` (${approval.whatsapp.rejection_reason})` : ""}`);
  }
}

async function sender(withWebhooks: boolean) {
  const list = (await api("GET", "https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=50")).senders as any[];
  const s = list.find((x) => x.sender_id === SENDER);
  if (!s) throw new Error(`WhatsApp-Sender ${SENDER} nicht gefunden`);
  const update: Record<string, unknown> = {
    profile: {
      about: "Sushi in Bad Kissingen · Tisch reservieren auf makilove.de",
      description: "MakiLove – Sushi-Restaurant in Bad Kissingen. Hier bekommst du Bestätigungen und Erinnerungen zu deiner Tischreservierung.",
      address: "Kurhausstr. 11A, 97688 Bad Kissingen",
      vertical: "Restaurant",
      emails: [{ email: "makilove@hotel-weisses-haus.com", label: "Email" }],
      websites: [{ website: SITE, label: "Website" }],
      logo_url: `${SITE}/branding/makilove-icon-1024.png`,
    },
  };
  if (withWebhooks) {
    update.webhook = {
      callback_url: `${SITE}/api/twilio/inbound`,
      callback_method: "POST",
      status_callback_url: `${SITE}/api/twilio/status`,
      status_callback_method: "POST",
    };
  }
  const updated = await api("POST", `https://messaging.twilio.com/v2/Channels/Senders/${s.sid}`, update);
  console.log(`sender ${updated.sender_id} ${updated.status} profile=${updated.profile?.name} webhook=${updated.webhook?.callback_url || "-"}`);
}

(async () => {
  await templates();
  await sender(process.argv.includes("--webhooks"));
})().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
