import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron";
import { runMailboxJob } from "@/lib/mailbox/job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Called every 2 minutes by Supabase pg_cron (supabase/cron.sql) with Bearer
 * CRON_SECRET: forwards new mail of the restaurant mailbox to Telegram.
 */
async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runMailboxJob()) });
  } catch (error) {
    console.error("[mailbox] job failed:", error);
    return NextResponse.json({ ok: false, error: "mailbox job failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
