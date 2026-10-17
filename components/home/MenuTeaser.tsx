import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const t = getMessages();
const m = t.home.menu;

/** 04 / Speisekarte — heading, two category cards, link to the full menu. */
export function MenuTeaser() {
  return (
    <section id="speisekarte" className="scroll-mt-20 lg:scroll-mt-24">
      <div className="page-container flex flex-col items-start gap-8 py-12 lg:py-20">
        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold leading-4 text-brand">{m.eyebrow}</p>
            <h2 className="text-4xl font-extrabold leading-[42px] md:text-[44px] md:leading-[52px] lg:text-[clamp(40px,3.6vw,52px)] lg:leading-[1.154]">
              {m.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
          </div>
          <p className="text-base leading-[26px] text-muted lg:w-[370px]">
            {m.body[0]}
            <br />
            {m.body[1]}
          </p>
        </div>

        <ul className="grid w-full gap-6 md:grid-cols-2">
          {m.categories.map((category) => (
            <li key={category.title}>
              <Link href="/speisekarte" className="focus-ring group flex flex-col gap-4 rounded-2xl">
                <div className="relative aspect-[342/230] overflow-hidden rounded-2xl bg-paper lg:aspect-[628/320]">
                  <Image
                    src={category.image}
                    alt={category.alt}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-[22px] font-extrabold leading-8 lg:text-[26px] lg:leading-[38px]">
                      {category.title}
                    </h3>
                    <p className="text-[13px] leading-6 text-muted lg:text-[15px]">{category.text}</p>
                  </div>
                  <Icon name="arrow-link" className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <ButtonLink href="/speisekarte" variant="secondary" className="w-full md:w-[300px]">
          {m.cta}
        </ButtonLink>
      </div>
    </section>
  );
}
