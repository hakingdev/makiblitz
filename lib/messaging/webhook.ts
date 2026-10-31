import type { NextRequest } from "next/server";
import { getBaseUrl } from "@/lib/site";
import { isValidTwilioSignature } from "./twilio";

/**
 * Reads a Twilio webhook (form-encoded POST) and checks its signature against
 * the public URL Twilio called. Returns the parameters, or null if the
 * request isn't from Twilio.
 */
export async function readTwilioWebhook(req: NextRequest, path: string): Promise<Record<string, string> | null> {
  const form = await req.formData().catch(() => null);
  if (!form) return null;
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  const url = `${getBaseUrl()}${path}`;
  return isValidTwilioSignature(url, params, req.headers.get("x-twilio-signature")) ? params : null;
}
