"use client";

import { useI18n } from "@/lib/i18n/client";

export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-md bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {t.layout.skipToContent}
    </a>
  );
}
