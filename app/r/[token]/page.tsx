import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/site/PageShell";
import { ManageCard } from "@/components/reservation/ManageCard";
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

  const firstName = reservation.name.split(/\s+/)[0] ?? "";

  return (
    <PageShell>
      <div className="page-container flex flex-col items-center pb-12 pt-6 lg:pb-16 lg:pt-12">
        <ManageCard
          token={params.token}
          initialState={manageState(reservation)}
          firstName={firstName}
          visit={{ guests: reservation.guests, date: reservation.date, time: reservation.time }}
        />
      </div>
    </PageShell>
  );
}
