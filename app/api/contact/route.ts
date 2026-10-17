import { NextRequest, NextResponse } from "next/server";
import { sendContactMail } from "@/lib/contact/mail";
import { contactMessageErrors, normalizeContactMessage } from "@/lib/contact/validate";
import { isMailConfigured } from "@/lib/waitlist/mailer";
import { isRateLimited } from "@/lib/waitlist/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? req.ip ?? "unknown";
}

const str = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * POST /api/contact — forwards the Kontakt form to MAIL_TO (reply-to = sender).
 * Nothing is stored. 200 · 400 { fields } · 429 · 503 when mail can't be sent.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = { name: str(body.name), email: str(body.email), message: str(body.message) };
  const fields = Object.keys(contactMessageErrors(input));
  if (fields.length > 0) {
    return NextResponse.json({ error: "invalid", fields }, { status: 400 });
  }

  if (isRateLimited(`contact:${clientIp(req)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const message = normalizeContactMessage(input);

  if (!isMailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[contact] BREVO_API_KEY missing — message not delivered");
      return NextResponse.json({ error: "unavailable" }, { status: 503 });
    }
    console.info("[contact] mail not configured — message from", message.email, `(${message.message.length} chars)`);
    return NextResponse.json({ ok: true });
  }

  try {
    await sendContactMail(message);
  } catch (error) {
    console.error("[contact] mail failed:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
