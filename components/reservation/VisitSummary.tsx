import { getMessages } from "@/lib/i18n";
import { formatShortDate } from "@/lib/reservation/dates";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { Visit } from "@/components/reservation/ReservationProvider";

const t = getMessages();
const r = t.reservation;

export function guestsLabel(guests: number) {
  return `${guests} ${guests === 1 ? r.person : r.persons}`;
}

/** Reservation / Summary — blush card; rows stack on mobile, sit in one line from lg. */
export function VisitSummary({ visit, className }: { visit: Visit; className?: string }) {
  const rows: { icon: IconName; text: string }[] = [
    { icon: "users", text: guestsLabel(visit.guests) },
    { icon: "calendar", text: formatShortDate(visit.date) },
    { icon: "clock", text: `${visit.time} ${r.timeSuffix}` },
  ];

  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl bg-blush p-4 text-left", className)}>
      <p className="text-[10px] font-bold leading-[15px] text-brand">{r.contact.summaryTitle}</p>
      <ul className="flex flex-col gap-2 lg:flex-row lg:gap-6">
        {rows.map((row) => (
          <li key={row.icon} className="flex items-center gap-2">
            <Icon name={row.icon} />
            <span className="text-[13px] font-bold leading-[19px] text-ink">{row.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
