"use client";

import { ButtonLink } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/client";

/** Shown for any unknown address; in Hindi under /hi/… (the language comes from the URL). */
export default function NotFound() {
  const { t, href } = useI18n();
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <p className="text-sm font-medium text-fg-subtle">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-fg">{t.notFound.title}</h1>
      <p className="mt-3 text-fg-muted">{t.notFound.text}</p>
      <div className="mt-6 flex justify-center gap-3">
        <ButtonLink href={href("/tools")}>{t.notFound.browse}</ButtonLink>
        <ButtonLink href={href("/")} variant="secondary">
          {t.notFound.home}
        </ButtonLink>
      </div>
    </div>
  );
}
