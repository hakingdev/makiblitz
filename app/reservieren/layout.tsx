import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";
import { ReservationProvider } from "@/components/reservation/ReservationProvider";
import { ReservationFooter, ReservationHeader } from "@/components/reservation/ReservationChrome";

const t = getMessages();

export const metadata: Metadata = {
  title: t.reservation.metaTitle,
  description: t.reservation.visit.body,
};

/** One provider for all three steps, so the draft survives step changes. */
export default function ReservationLayout({ children }: { children: ReactNode }) {
  return (
    <ReservationProvider>
      <div className="flex min-h-dvh flex-col">
        <ReservationHeader />
        <main className="flex-1">{children}</main>
        <ReservationFooter />
      </div>
    </ReservationProvider>
  );
}
