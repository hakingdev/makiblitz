"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";
import { getMessages } from "@/lib/i18n";
import { GUEST_OPTIONS, TIME_SLOTS } from "@/lib/reservation/config";
import {
  firstBookableDate,
  formatDayMonth,
  formatLongDate,
  isSlotAvailable,
  lastBookableDate,
} from "@/lib/reservation/dates";
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

/** Step 1 — guests, day and time (Figma 6:221 mobile · 6:29 desktop). */
export function VisitStep() {
  const router = useRouter();
  const { visit, confirmed, hydrated, now, setVisit, reset } = useReservation();
  const dateInput = useRef<HTMLInputElement>(null);

  // Coming back after a finished booking starts a new one.
  useEffect(() => {
    if (hydrated && confirmed) reset();
  }, [hydrated, confirmed, reset]);

  const minDate = hydrated ? firstBookableDate(now) : undefined;
  const maxDate = hydrated ? lastBookableDate(now) : undefined;

  function selectDate(date: string) {
    if (!date || (minDate && date < minDate) || (maxDate && date > maxDate)) return;
    const keepTime = visit.time && isSlotAvailable(date, visit.time, now);
    setVisit({ date, time: keepTime ? visit.time : null });
  }

  function openPicker() {
    try {
      dateInput.current?.showPicker();
    } catch {
      // Older browsers: the focused native input still opens on tap/keyboard.
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (visit.time) router.push("/reservieren/kontakt");
  }

  const complete = hydrated && Boolean(visit.date && visit.time);

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
              checked={visit.guests === g}
              onSelect={(value) => setVisit({ guests: Number(value) })}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="visit-date" className={fieldLabel}>
          {v.dateLabel}
        </label>
        {/* Native picker underneath (best on phones), German long date on top. */}
        <div className="relative">
          <input
            ref={dateInput}
            id="visit-date"
            type="date"
            value={visit.date}
            min={minDate}
            max={maxDate}
            disabled={!hydrated}
            onChange={(e) => selectDate(e.target.value)}
            onClick={openPicker}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          />
          <div
            aria-hidden="true"
            className={cn(
              inputBase,
              "flex h-14 items-center border-line",
              "peer-hover:border-ink/30 peer-focus-visible:border-ink/40 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/15",
            )}
          >
            <span className={visit.date ? "text-ink" : "text-muted"}>
              {visit.date ? formatLongDate(visit.date) : v.datePlaceholder}
            </span>
          </div>
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
              checked={visit.time === slot}
              disabled={hydrated && !isSlotAvailable(visit.date, slot, now)}
              onSelect={(time) => setVisit({ time })}
            />
          ))}
        </div>
        <p className="text-xs leading-5 text-muted">{v.timeHint}</p>
      </fieldset>

      {complete && (
        <p
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg bg-blush px-4 py-3 text-xs font-bold leading-[17px] text-brand lg:text-sm lg:leading-5"
        >
          <Icon name="check-18" />
          {guestsLabel(visit.guests)} · {formatDayMonth(visit.date)} · {visit.time}{" "}
          {t.reservation.timeSuffix}
        </p>
      )}

      <Button type="submit" disabled={!complete} className="w-full">
        {v.submit}
      </Button>

      <p className="text-xs leading-5 text-muted">
        {v.groupNote.split(t.contact.email)[0]}
        <a href={`mailto:${t.contact.email}`} className="focus-ring rounded underline-offset-2 hover:text-ink hover:underline">
          {t.contact.email}
        </a>
      </p>
    </form>
  );
}
