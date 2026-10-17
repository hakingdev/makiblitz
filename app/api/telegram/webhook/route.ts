import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate, type TgUpdate } from "@/lib/telegram/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSecret(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/telegram/webhook — Telegram delivers bot updates here (registered
 * with `npm run telegram:setup`). Only calls carrying TELEGRAM_WEBHOOK_SECRET
 * are processed; the answer is always 200 so Telegram doesn't retry.
 */
export async function POST(req: NextRequest) {
  if (!validSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 401 });
  }
  try {
    await handleTelegramUpdate((await req.json()) as TgUpdate);
  } catch (error) {
    console.error("[telegram] webhook update failed:", error);
  }
  return NextResponse.json({ ok: true });
}
