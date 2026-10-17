import Image from "next/image";
import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const t = getMessages();
const h = t.home.hero;

/** 02 / Hero — stacked on mobile, copy | photo side by side from lg. */
export function Hero() {
  return (
    <section className="page-container flex flex-col gap-8 pb-10 pt-8 lg:flex-row lg:items-center lg:gap-16 lg:pb-16 lg:pt-12">
      <div className="flex flex-col items-start gap-6 lg:max-w-[600px] lg:flex-1">
        <p className="flex items-center gap-2 text-[10px] font-bold leading-[15px] tracking-[1.5px] text-brand lg:text-xs lg:leading-[17px]">
          <Icon name="pin" />
          {h.eyebrow}
        </p>

        <h1 className="text-[43px] font-extrabold leading-[51px] md:text-[60px] md:leading-[68px] lg:text-[clamp(56px,5.4vw,78px)] lg:leading-[1.128]">
          <span className="block">{h.headline[0]}</span>
          <span className="block text-brand">{h.headline[1]}</span>
        </h1>

        <p className="text-base leading-[26px] text-muted lg:max-w-[540px] lg:text-lg lg:leading-[29px]">
          {h.body[0]}
          <br />
          {h.body[1]}
        </p>

        <div className="flex w-full flex-col items-start gap-4 md:w-auto md:flex-row md:items-center">
          <ButtonLink href="/reservieren" className="w-full md:w-[240px]">
            {h.cta}
          </ButtonLink>
          <Link
            href="#speisekarte"
            className="focus-ring rounded text-[15px] font-bold leading-[22px] transition-colors hover:text-brand"
          >
            {h.menuLink}
          </Link>
        </div>

        <p className="text-xs leading-[17px] text-muted">{h.note}</p>
      </div>

      <div className="relative w-full lg:max-w-[616px] lg:flex-1">
        {/* Figma: object-contain inside an asymmetric mask (tl/br 80 → 160 on desktop). */}
        <div className="relative aspect-[342/330] overflow-hidden rounded-[80px_24px_80px_24px] bg-paper md:aspect-[616/548] lg:rounded-[160px_24px_160px_24px]">
          <Image
            src="/images/rolle-04.png"
            alt={h.photoAlt}
            fill
            priority
            sizes="(min-width: 1024px) 616px, 100vw"
            className="object-contain"
          />
        </div>

        <div className="absolute bottom-[18px] right-2 flex size-[104px] flex-col items-center justify-center rounded-full bg-brand text-white lg:bottom-[30px] lg:right-4 lg:size-32">
          <Icon name="heart" className="lg:hidden" />
          <Icon name="heart-24" className="hidden lg:block" />
          <p className="text-center text-[11px] font-bold leading-[17px] lg:text-[13px] lg:leading-5">
            {h.seal[0]}
            <br />
            {h.seal[1]}
          </p>
        </div>
      </div>
    </section>
  );
}
