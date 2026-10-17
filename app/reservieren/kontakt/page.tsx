import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { StepIntro, StepLayout } from "@/components/reservation/ReservationChrome";
import { ContactStep } from "@/components/reservation/ContactStep";

const c = getMessages().reservation.contact;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ReservationContactPage() {
  return (
    <StepLayout
      intro={<StepIntro step={2} title={c.title} body={c.body} photoAspectClass="aspect-[2/1]" />}
    >
      <ContactStep />
    </StepLayout>
  );
}
