import { getBaseUrl } from "@/lib/site";

/** The guest's own page to confirm or cancel a booking: /r/<manage token>. */
export function manageUrl(token: string): string {
  return `${getBaseUrl()}/r/${token}`;
}
