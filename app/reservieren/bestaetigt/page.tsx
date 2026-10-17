import type { Metadata } from "next";
import { ConfirmedStep } from "@/components/reservation/ConfirmedStep";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ReservationConfirmedPage() {
  return <ConfirmedStep />;
}
