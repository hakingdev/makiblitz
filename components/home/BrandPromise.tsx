import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

const t = getMessages();

/** 03 / Brand promise — 2 claims on mobile, 3 (longer wording) from md. */
export function BrandPromise() {
  return (
    <section className="bg-brand text-white">
      <ul className="page-container flex items-center gap-6 py-5 md:justify-between md:py-6">
        {t.home.promise.map((item) => (
          <li
            key={item.desktop}
            className={cn("flex items-center gap-4", !item.mobile && "hidden md:flex")}
          >
            <Icon name="heart" />
            <span className="text-[11px] font-bold leading-4 tracking-[1.5px] lg:text-sm lg:leading-5">
              <span className="md:hidden">{item.mobile}</span>
              <span className="hidden md:inline">{item.desktop}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
