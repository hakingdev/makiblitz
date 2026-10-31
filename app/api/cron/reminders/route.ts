import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runReminderJob } from "@/lib/reservation/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called every 5 minutes by Supabase pg_cron (supabase/cron.sql) with Bearer CRON_SECRET. */
function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await runReminderJob();
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
