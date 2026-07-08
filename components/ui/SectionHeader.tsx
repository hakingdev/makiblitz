import Link from "next/link";

export function SectionHeader({
  title,
  href,
  action = "View all",
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-semibold text-white/55 transition hover:text-white"
        >
          {action}
        </Link>
      )}
    </div>
  );
}
