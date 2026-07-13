import de from "@/messages/de.json";

export type Messages = typeof de;

/**
 * Single-locale dictionary for the coming-soon phase.
 * When English launches, add messages/en.json (same shape as de.json)
 * and resolve the locale here instead of hardcoding it.
 */
export function getMessages(): Messages {
  return de;
}
