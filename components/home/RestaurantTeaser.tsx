import Image from "next/image";
import { getMessages } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";

const t = getMessages();
const r = t.home.restaurant;

/** 05 / Restaurant — blush band, photo + "Dein nächstes Sushi-Date?" copy. */
export function RestaurantTeaser() {
  return (
    <section className="bg-blush">
      <div className="page-container flex flex-col items-center gap-8 py-12 lg:flex-row lg:gap-16 lg:py-16">
        <div className="relative aspect-[342/270] w-full overflow-hidden rounded-3xl lg:aspect-[608/438] lg:flex-1">
          <Image
            src="/images/restaurant-05.jpg"
            alt={r.photoAlt}
            fill
            sizes="(min-width: 1024px) 608px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex w-full flex-col items-start gap-6 lg:flex-1">
          <p className="text-[11px] font-bold leading-4 text-brand">{r.eyebrow}</p>
          <h2 className="text-4xl font-extrabold leading-[42px] md:text-[44px] md:leading-[52px] lg:text-[clamp(40px,3.6vw,52px)] lg:leading-[1.154]">
            {r.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h2>
          <p className="text-base leading-[27px] text-muted lg:max-w-[520px]">{r.body}</p>
          <p className="font-script text-xl leading-[38px] text-brand lg:text-[25px] lg:leading-[46px]">
            {r.script}
          </p>
          <ButtonLink href="/reservieren" className="w-full md:w-[240px]">
            {r.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
