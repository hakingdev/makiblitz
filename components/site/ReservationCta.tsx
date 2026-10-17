import { getMessages } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";

const t = getMessages();
const c = t.home.cta;

/** 06 / Reservation CTA — red closing band, shared by the content pages. */
export function ReservationCta() {
  return (
    <section className="bg-brand text-white">
      <div className="page-container flex flex-col items-center gap-6 py-12 text-center lg:gap-8 lg:py-16">
        <p className="text-[11px] font-bold leading-4">{c.eyebrow}</p>
        <h2 className="text-4xl font-extrabold leading-[43px] md:text-[48px] md:leading-[56px] lg:text-[clamp(44px,4.45vw,64px)] lg:leading-[1.125]">
          {c.title.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h2>
        <p className="max-w-[900px] text-base leading-[26px]">{c.body}</p>
        <ButtonLink href="/reservieren" variant="white" className="w-full md:w-[280px]">
          {c.button}
        </ButtonLink>
      </div>
    </section>
  );
}
