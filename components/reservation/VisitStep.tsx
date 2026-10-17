"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getMessages } from "@/lib/i18n";
import type { AvailabilityBySlot } from "@/lib/reservation/tables";
import { FEW_SEATS_LEFT, GUEST_OPTIONS, TIME_SLOTS } from "@/lib/reservation/config";
import { formatDayMonth, formatLongDate, isSlotAvailable } from "@/lib/reservation/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Choice } from "@/components/ui/Choice";
import { fieldLabel, inputBase } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formTitle } from "@/components/reservation/ReservationChrome";
import { guestsLabel } from "@/components/reservation/VisitSummary";
import { useReservation } from "@/components/reservation/ReservationProvider";

const t = getMessages();
const v = t.reservation.visit;

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** Table availability per slot for the chosen day; null while loading or when the request failed. */
function useAvailability(date: string, enabled: boolean) {
  const [result, setResult] = useState<{ date: string; slots: AvailabilityBySlot } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !date) return;
    let cancelled = false;
    setFailed(false);
    fetch(`/api/reservations/availability?date=${date}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { date: string; slots: AvailabilityBySlot }) => {
        if (!cancelled) setResult({ date: data.date, slots: data.slots });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [date, enabled]);

  return { slots: result?.date === date ? result.slots : null, failed };
}

/** Step 1 — guests, day and time (Figma 6:221 mobile · 6:29 desktop). */
export function VisitStep() {
  const router = useRouter();
  const { visit, confirmed, hydrated, now, dates, setVisit, reset } = useReservation();
  const { slots, failed } = useAvailability(visit.date, hydrated);

  // Coming back after a finished booking starts a new one.
  useEffect(() => {
    if (hydrated && confirmed) reset();
  }, [hydrated, confirmed, reset]);

  // Unknown availability (loading/failed) never blocks — the server decides on submit.
  const maxPartyAt = (slot: string) => (slots ? slots[slot]?.maxParty ?? 0 : Infinity);
  const freeSeatsAt = (slot: string) => (slots ? slots[slot]?.freeSeats ?? 0 : Infinity);
  const timeOpen = (slot: string) => hydrated && Boolean(visit.date) && isSlotAvailable(visit.date, slot, now);
  const fits = (slot: string) => timeOpen(slot) && maxPartyAt(slot) >= visit.guests;

  const { time, guests } = visit;
  const overbooked = Boolean(time && timeOpen(time) && maxPartyAt(time) < guests);
  const dayFull = Boolean(slots) && !TIME_SLOTS.some(fits);
  // The user's example: 18:00 is full → offer a later time first (a table frees up after 2:30 h).
  const alternative = time
    ? TIME_SLOTS.find((slot) => slot > time && fits(slot)) ??
      [...TIME_SLOTS].reverse().find((slot) => slot < time && fits(slot))
    : undefined;
  const fewLeft = time && !overbooked && slots ? freeSeatsAt(time) : null;

  let notice: { tone: "error" | "info"; text: string } | null = null;
  if (overbooked && time) {
    notice = {
      tone: "error",
      text: alternative
        ? `${fill(v.overbooked, { time, guests: guestsLabel(guests) })} ${fill(v.overbookedSuggest, { alt: alternative })}`
        : fill(v.overbookedNoAlt, { guests: guestsLabel(guests) }),
    };
  } else if (dayFull) {
    notice = { tone: "error", text: fill(v.overbookedNoAlt, { guests: guestsLabel(guests) }) };
  } else if (time && fewLeft !== null && fewLeft <= FEW_SEATS_LEFT) {
    notice = {
      tone: "info",
      text: fewLeft === 1 ? fill(v.fewSeatsOne, { time }) : fill(v.fewSeatsMany, { time, n: fewLeft }),
    };
  }

  const complete = hydrated && Boolean(visit.date && time) && !overbooked && Boolean(time && timeOpen(time));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (complete) router.push("/reservieren/kontakt");
  }

  if (hydrated && dates.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className={formTitle}>{v.formTitle}</h2>
        <p className="rounded-lg bg-blush px-4 py-3 text-sm font-bold leading-5 text-brand">{v.noDates}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <h2 className={formTitle}>{v.formTitle}</h2>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(fieldLabel, "mb-2")}>{v.guestsLabel}</legend>
        <div className="grid grid-cols-5 gap-2">
          {GUEST_OPTIONS.map((g, i) => (
            <Choice
              key={g}
              name="guests"
              value={String(g)}
              label={i === GUEST_OPTIONS.length - 1 ? `${g}+` : String(g)}
              checked={guests === g}
              onSelect={(value) => setVisit({ guests: Number(value) })}
            />
          ))}
        </div>
        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "mt-1 rounded-lg px-4 py-3 text-xs font-bold leading-[18px] lg:text-sm lg:leading-5",
              notice.tone === "error" ? "border border-brand bg-white text-brand" : "bg-blush text-brand",
            )}
          >
            {notice.text}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="visit-date" className={fieldLabel}>
          {v.dateLabel}
        </label>
        {/* Only open days are offered; a native select keeps the Field look and the phone's own picker. */}
        <div className="relative">
          <select
            id="visit-date"
            value={visit.date}
            disabled={!hydrated}
            onChange={(e) => {
              const date = e.target.value;
              setVisit({ date, time: time && isSlotAvailable(date, time, now) ? time : null });
            }}
            className={cn(inputBase, "h-14 cursor-pointer appearance-none border-line pr-12")}
          >
            {!hydrated && <option value="">{v.datePlaceholder}</option>}
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatLongDate(date)}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-5 top-1/2 size-2.5 -translate-y-3/4 rotate-45 border-b-[1.5px] border-r-[1.5px] border-ink"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={cn(fieldLabel, "mb-2")}>{v.timeLabel}</legend>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((slot) => (
            <Choice
              key={slot}
              name="time"
              value={slot}
              label={slot}
              checked={time === slot}
              disabled={hydrated && !fits(slot)}
              onSelect={(value) => setVisit({ time: value })}
            />
          ))}
        </div>
        <p className="text-xs leading-5 text-muted">{failed ? v.availabilityError : v.timeHint}</p>
      </fieldset>

      {complete && time && (
        <p
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg bg-blush px-4 py-3 text-xs font-bold leading-[17px] text-brand lg:text-sm lg:leading-5"
        >
          <Icon name="check-18" />
          {guestsLabel(guests)} · {formatDayMonth(visit.date)} · {time} {t.reservation.timeSuffix}
        </p>
      )}

      <Button type="submit" disabled={!complete} className="w-full">
        {v.submit}
      </Button>

      <p className="text-xs leading-5 text-muted">
        {v.groupNote.split(t.contact.email)[0]}
        <a
          href={`mailto:${t.contact.email}`}
          className="focus-ring rounded underline-offset-2 hover:text-ink hover:underline"
        >
          {t.contact.email}
        </a>
      </p>
    </form>
  );
}
