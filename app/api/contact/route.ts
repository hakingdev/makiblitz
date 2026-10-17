import { NextRequest, NextResponse } from "next/server";
import { sendContactMail } from "@/lib/contact/mail";
import { saveContactRequest } from "@/lib/contact/store";
import { contactMessageErrors, normalizeContactMessage } from "@/lib/contact/validate";
import { notifyContactRequest } from "@/lib/telegram/notify";
import { hashIp } from "@/lib/waitlist/crypto";
import { isMailConfigured } from "@/lib/waitlist/mailer";
import { isRateLimited } from "@/lib/waitlist/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

function safeIpHash(ip: string): string | null {
  try {
    return hashIp(ip);
  } catch {
    return null;
  }
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * POST /api/contact — the Kontakt form. The request is stored (so it can be
 * answered from Telegram), posted to the Telegram chat with an "Ответить"
 * button, and mailed to MAIL_TO only if Telegram fails.
 * 200 · 400 { fields } · 429 · 503 when it reached nobody.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = { name: str(body.name), email: str(body.email), phone: str(body.phone), message: str(body.message) };
  const fields = Object.keys(contactMessageErrors(input));
  if (fields.length > 0) {
    return NextResponse.json({ error: "invalid", fields }, { status: 400 });
  }

  const ip = clientIp(req);
  if (isRateLimited(`contact:${ip}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const message = normalizeContactMessage(input);
  const request = {
    name: message.name,
    email: message.email,
    phone: message.phone || null,
    message: message.message,
    ipHash: safeIpHash(ip),
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };

  const id = await saveContactRequest(request);
  let delivered = await notifyContactRequest(request, id);

  if (!delivered && isMailConfigured()) {
    try {
      await sendContactMail(message);
      delivered = true;
    } catch (error) {
      console.error("[contact] fallback mail failed:", error);
    }
  }

  if (!delivered) {
    if (process.env.NODE_ENV === "production" && !id) {
      console.error("[contact] request reached nobody (no Telegram, no mail, not stored)");
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.info("[contact] no Telegram/mail configured — stored request", id);
  }
  return NextResponse.json({ ok: true });
}
