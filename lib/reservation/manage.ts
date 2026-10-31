import { restaurantNow, timeToMinutes, type RestaurantNow } from "./dates";
import type { StoredReservation } from "./store";

/** What the guest's page /r/<token> offers. */
export type ManageState = "pending" | "confirmed" | "cancelled" | "past";

/** Minutes from `now` (restaurant time) until the visit starts; negative once it began. */
export function minutesUntilVisit(r: Pick<StoredReservation, "date" | "time">, now: RestaurantNow = restaurantNow()): number {
  const days = Math.round((Date.parse(`${r.date}T00:00:00Z`) - Date.parse(`${now.date}T00:00:00Z`)) / 86_400_000);
  return days * 24 * 60 + timeToMinutes(r.time) - now.minutes;
}

export function manageState(r: StoredReservation, now: RestaurantNow = restaurantNow()): ManageState {
  if (r.status === "cancelled") return "cancelled";
  if (minutesUntilVisit(r, now) <= 0) return "past";
  return r.confirmedAt ? "confirmed" : "pending";
}
