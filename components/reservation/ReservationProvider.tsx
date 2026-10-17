"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_GUESTS, GUEST_OPTIONS } from "@/lib/reservation/config";
import {
  firstBookableDate,
  isSlotAvailable,
  lastBookableDate,
  restaurantNow,
  type RestaurantNow,
} from "@/lib/reservation/dates";

export type Visit = { guests: number; date: string; time: string | null };
export type Contact = { name: string; email: string; phone: string; notes: string };
type Draft = { visit: Visit; contact: Contact; confirmed: boolean };

type ReservationContextValue = Draft & {
  /** false until the draft has been restored on the client (dates depend on "now"). */
  hydrated: boolean;
  now: RestaurantNow;
  setVisit: (patch: Partial<Visit>) => void;
  setContact: (patch: Partial<Contact>) => void;
  confirm: () => void;
  reset: () => void;
};

/** Survives a reload or a detour to /datenschutz, not the browser session. */
const STORAGE_KEY = "ml_reservation";

const EMPTY_CONTACT: Contact = { name: "", email: "", phone: "", notes: "" };

function freshDraft(now: RestaurantNow): Draft {
  return {
    visit: { guests: DEFAULT_GUESTS, date: firstBookableDate(now), time: null },
    contact: EMPTY_CONTACT,
    confirmed: false,
  };
}

/** Drops anything a stored draft can no longer honour (past dates, gone slots). */
function restoreDraft(now: RestaurantNow): Draft {
  const fresh = freshDraft(now);
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const stored = JSON.parse(raw) as Partial<Draft>;
    const visit = { ...fresh.visit, ...stored.visit };
    const contact = { ...EMPTY_CONTACT, ...stored.contact };
    const confirmed = stored.confirmed === true;
    if (confirmed) return { visit, contact, confirmed };

    if (!GUEST_OPTIONS.some((g) => g === visit.guests)) visit.guests = DEFAULT_GUESTS;
    if (!visit.date || visit.date < fresh.visit.date || visit.date > lastBookableDate(now)) {
      visit.date = fresh.visit.date;
    }
    if (visit.time && !isSlotAvailable(visit.date, visit.time, now)) visit.time = null;
    return { visit, contact, confirmed };
  } catch {
    return fresh;
  }
}

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function ReservationProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<RestaurantNow>({ date: "", minutes: 0 });
  const [draft, setDraft] = useState<Draft>({
    visit: { guests: DEFAULT_GUESTS, date: "", time: null },
    contact: EMPTY_CONTACT,
    confirmed: false,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const current = restaurantNow();
    setNow(current);
    setDraft(restoreDraft(current));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // Private mode / storage disabled: the flow still works in memory.
    }
  }, [draft, hydrated]);

  const setVisit = useCallback(
    (patch: Partial<Visit>) => setDraft((d) => ({ ...d, visit: { ...d.visit, ...patch } })),
    [],
  );
  const setContact = useCallback(
    (patch: Partial<Contact>) => setDraft((d) => ({ ...d, contact: { ...d.contact, ...patch } })),
    [],
  );
  const confirm = useCallback(() => setDraft((d) => ({ ...d, confirmed: true })), []);
  const reset = useCallback(() => {
    const current = restaurantNow();
    setNow(current);
    setDraft(freshDraft(current));
  }, []);

  const value = useMemo(
    () => ({ ...draft, hydrated, now, setVisit, setContact, confirm, reset }),
    [draft, hydrated, now, setVisit, setContact, confirm, reset],
  );

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
}

export function useReservation() {
  const ctx = useContext(ReservationContext);
  if (!ctx) throw new Error("useReservation must be used inside <ReservationProvider>");
  return ctx;
}
