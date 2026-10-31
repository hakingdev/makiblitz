import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

/** Cron endpoints are called by Supabase pg_cron (supabase/cron.sql) with Bearer CRON_SECRET. */
export function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
