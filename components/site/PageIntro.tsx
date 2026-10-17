import type { ReactNode } from "react";

/** "… / Introduction" block of Galerie and Speisekarte: eyebrow, two-line headline, body. */
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string[];
  children: ReactNode;
}) {
  return (
    <div className="page-container flex flex-col items-start gap-4 py-8 lg:pb-12 lg:pt-14">
      <p className="text-[11px] font-bold leading-4 text-brand">{eyebrow}</p>
      <h1 className="text-4xl font-extrabold leading-[43px] md:text-[48px] md:leading-[56px] lg:text-[clamp(52px,4.45vw,64px)] lg:leading-[1.125]">
        {title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>
      {children}
    </div>
  );
}
