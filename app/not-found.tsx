import { getMessages } from "@/lib/i18n";
import { PageShell } from "@/components/site/PageShell";
import { ButtonLink } from "@/components/ui/Button";

const t = getMessages();

export default function NotFound() {
  return (
    <PageShell>
      <div className="page-container flex flex-col items-center gap-6 py-20 text-center lg:py-32">
        <p className="font-script text-2xl text-brand">404</p>
        <h1 className="text-[34px] font-extrabold leading-[41px] lg:text-[52px] lg:leading-[60px]">
          {t.notFound.title}
        </h1>
        <p className="text-base leading-[26px] text-muted">{t.notFound.body}</p>
        <ButtonLink href="/" className="w-full max-w-[342px]">
          {t.notFound.cta}
        </ButtonLink>
      </div>
    </PageShell>
  );
}
