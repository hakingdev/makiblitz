import { getMessages } from "@/lib/i18n";
import { StepIntro, StepLayout } from "@/components/reservation/ReservationChrome";
import { VisitStep } from "@/components/reservation/VisitStep";

const v = getMessages().reservation.visit;

export default function ReservationVisitPage() {
  return (
    <StepLayout
      intro={<StepIntro step={1} title={v.title} body={v.body} photoAspectClass="aspect-[440/282]" />}
    >
      <VisitStep />
    </StepLayout>
  );
}
