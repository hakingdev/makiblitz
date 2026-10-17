"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getMessages } from "@/lib/i18n";
import { buildIcs, downloadIcs } from "@/lib/reservation/ics";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { MapsLink } from "@/components/ui/ContactLinks";
import { VisitSummary, guestsLabel } from "@/components/reservation/VisitSummary";
import { useReservation } from "@/components/reservation/ReservationProvider";

const t = getMessages();
const c = t.reservation.confirmed;
const address = `${t.contact.street}, ${t.contact.city}`;

/** Step 3 — confirmation (Figma 6:358 mobile · 6:172 desktop). */
export function ConfirmedStep() {
  const router = useRouter();
  const { visit, contact, confirmed, hydrated } = useReservation();

  useEffect(() => {
    if (hydrated && !confirmed) router.replace("/reservieren");
  }, [hydrated, confirmed, router]);

  if (!hydrated || !confirmed || !visit.time) return null;

  const firstName = contact.name.split(/\s+/)[0] ?? "";

  function addToCalendar() {
    if (!visit.time) return;
    const ics = buildIcs({
      date: visit.date,
      time: visit.time,
      title: `${c.calendarTitle} (${guestsLabel(visit.guests)})`,
      location: `${t.brand.name}, ${address}`,
      description: `${c.calendarTitle} · ${guestsLabel(visit.guests)}`,
    });
    downloadIcs(`makilove-${visit.date}.ics`, ics);
  }

  return (
    <div className="page-container flex flex-col items-center pb-8 pt-6 lg:pb-16 lg:pt-12">
      <div className="flex w-full max-w-[680px] flex-col items-center gap-6 text-center lg:rounded-3xl lg:border lg:border-line lg:bg-white lg:p-12">
        <div className="grid size-[72px] place-items-center rounded-full bg-blush">
          <Icon name="check-32" />
        </div>

        <h1 className="text-[38px] font-extrabold leading-[45px] lg:text-[52px] lg:leading-[60px]">
          {c.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="text-[15px] leading-[25px] text-muted">
          {c.body.map((line) => (
            <span key={line} className="block">
              {line.replace("{name}", firstName)}
            </span>
          ))}
        </p>

        <VisitSummary visit={visit} className="w-full" />

        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold leading-[26px]">{c.venueTitle}</p>
          <p className="text-sm leading-[22px] text-muted">
            <MapsLink className="block hover:text-ink lg:inline">
              <span className="block lg:inline">{t.contact.street}</span>
              <span className="hidden lg:inline">, </span>
              <span className="block lg:inline">{t.contact.city}</span>
            </MapsLink>
            <span className="block">{c.venueNote}</span>
          </p>
        </div>

        <Button onClick={addToCalendar} className="w-full">
          {c.calendar}
        </Button>
        <ButtonLink href="/" variant="secondary" className="w-full">
          {c.home}
        </ButtonLink>

        <p className="text-xs leading-[21px] text-muted">
          {c.changeNote.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
