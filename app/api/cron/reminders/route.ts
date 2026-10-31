import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { runReminderJob } from "@/lib/reservation/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Called every 5 minutes by Supabase pg_cron (supabase/cron.sql) with Bearer CRON_SECRET. */
async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await runReminderJob();
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
