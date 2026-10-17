import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { PageIntro } from "@/components/site/PageIntro";
import { MenuSection } from "@/components/menu/MenuSection";
import { getMessages } from "@/lib/i18n";
import { MENU } from "@/lib/menu";

const p = getMessages().menuPage;

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.metaDescription,
};

const column = (side: "left" | "right") => MENU.filter((category) => category.column === side);

/**
 * Speisekarte (Figma 15:637 mobile · 15:110 desktop). One list in menu order
 * on mobile; on desktop the categories split into two fixed columns, so each
 * layout is rendered for its own breakpoint.
 */
export default function SpeisekartePage() {
  return (
    <PageShell>
      <PageIntro eyebrow={p.eyebrow} title={p.title}>
        <p className="text-base leading-[23px] text-muted">{p.body}</p>
      </PageIntro>

      <div className="page-container pb-12 lg:pb-16">
        <div className="flex flex-col gap-8 lg:hidden">
          {MENU.map((category) => (
            <MenuSection key={category.id} category={category} idPrefix="menu" />
          ))}
        </div>
        <div className="hidden gap-16 lg:flex">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="flex min-w-0 flex-1 flex-col gap-8">
              {column(side).map((category) => (
                <MenuSection key={category.id} category={category} idPrefix="menu-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="bg-blush">
        <div className="page-container flex flex-col gap-4 py-8">
          <h2 className="text-[21px] font-bold leading-[29px] lg:text-[28px] lg:leading-[38px]">
            {p.allergens.title}
          </h2>
          <p className="text-sm leading-[23px] text-muted">{p.allergens.body}</p>
        </div>
      </section>
    </PageShell>
  );
}
