import Image from "next/image";
import { cn } from "@/lib/utils";

/** Photo tile with the small "01 / …" caption used on both gallery boards. */
export function GalleryPhoto({
  src,
  alt,
  caption,
  aspectClass,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  caption: string;
  aspectClass: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <div className={cn("relative overflow-hidden rounded-2xl bg-line", aspectClass)}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
      <figcaption className="text-[13px] font-bold leading-[19px] text-muted">{caption}</figcaption>
    </figure>
  );
}

export function GalleryHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <h1 className="text-[32px] font-extrabold leading-[40px] md:text-[40px] md:leading-[58px]">{title}</h1>
      <p className="text-base leading-[26px] text-muted">{body}</p>
    </div>
  );
}
