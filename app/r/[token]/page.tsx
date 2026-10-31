import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { Icon } from "@/components/ui/Icon";
import { MapsLink } from "@/components/ui/ContactLinks";
import { ButtonLink } from "@/components/ui/Button";
import { VisitSummary } from "@/components/reservation/VisitSummary";
import { ManageActions } from "@/components/reservation/ManageActions";
import { getMessages } from "@/lib/i18n";
import { manageState } from "@/lib/reservation/manage";
import { getReservationByToken } from "@/lib/reservation/store";

const t = getMessages();
const m = t.managePage;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: m.metaTitle,
  robots: { index: false, follow: false },
};

/**
 * The guest's own booking page, linked from the confirmation e-mail and the
 * WhatsApp/SMS reminders: confirm ("Ja, wir kommen") or cancel. The token is
 * a random code, not the reservation id. GET only shows — buttons POST.
 */
export default async function ManageReservationPage({ params }: { params: { token: string } }) {
  const reservation = await getReservationByToken(params.token);
  if (!reservation) notFound();

  const state = manageState(reservation);
  const copy = m[state];
  const firstName = reservation.name.split(/\s+/)[0] ?? "";

  return (
    <PageShell>
      <div className="page-container flex flex-col items-center pb-12 pt-6 lg:pb-16 lg:pt-12">
        <div className="flex w-full max-w-[680px] flex-col items-center gap-6 text-center lg:rounded-3xl lg:border lg:border-line lg:bg-white lg:p-12">
          <p className="text-[11px] font-bold leading-4 text-brand">{m.eyebrow}</p>
          {state === "confirmed" && (
            <div className="grid size-[72px] place-items-center rounded-full bg-blush">
              <Icon name="check-32" />
            </div>
          )}
          <h1 className="text-[38px] font-extrabold leading-[45px] lg:text-[52px] lg:leading-[60px]">
            {copy.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p className="text-[15px] leading-[25px] text-muted">{copy.body.replace("{name}", firstName)}</p>

          {state !== "cancelled" && (
            <>
              <VisitSummary
                visit={{ guests: reservation.guests, date: reservation.date, time: reservation.time }}
                className="w-full"
              />
              <p className="text-sm leading-[22px] text-muted">
                <MapsLink className="hover:text-ink">
                  {t.contact.street}, {t.contact.city}
                </MapsLink>
              </p>
            </>
          )}

          {(state === "pending" || state === "confirmed") && (
            <ManageActions token={params.token} state={state} />
          )}
          {(state === "cancelled" || state === "past") && (
            <ButtonLink href="/reservieren" className="w-full">
              {m.newBooking}
            </ButtonLink>
          )}
        </div>
      </div>
    </PageShell>
  );
}
