import { getMessages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { INK, PALETTE as C } from "./palette";

/**
 * Picture of where a file goes: your file → your phone or computer → your
 * ready file, while "our servers" never receive it. Text labels sit in HTML
 * so they stay readable and translatable.
 */
function Arrow() {
  return (
    <svg viewBox="0 0 64 24" className="h-6 w-14 shrink-0 rotate-90 sm:rotate-0" aria-hidden="true">
      <path d="M4 12h48" stroke={C.blue} strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />
      <path d="M48 5l9 7-9 7" fill="none" stroke={C.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="slide-x" cx="30" cy="12" r="4" fill={C.blue} />
    </svg>
  );
}

function Tile({ children, title, text }: { children: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex w-full max-w-[13rem] flex-col items-center text-center">
      <div className="w-32">{children}</div>
      <p className="mt-2 text-sm font-semibold text-fg">{title}</p>
      <p className="text-xs text-fg-muted">{text}</p>
    </div>
  );
}

export function PrivacyFlow({ locale = "en" }: { locale?: Locale }) {
  const t = getMessages(locale).privacyFlow;
  return (
    <div className="scroll-scope space-y-6">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:justify-center sm:gap-4">
        <Tile title={t.file.title} text={t.file.text}>
          <svg viewBox="0 0 128 96" aria-hidden="true">
            <rect x="30" y="10" width="68" height="78" rx="8" fill={C.white} stroke={C.slate} strokeWidth="2" />
            <rect x="40" y="20" width="48" height="40" rx="4" fill={C.blueSoft} />
            <circle cx="64" cy="36" r="9" fill={C.skin} />
            <path d="M48 60c2-11 9-15 16-15s14 4 16 15z" fill={C.shirt} />
            <rect x="40" y="68" width="40" height="5" rx="2.5" fill={C.line} />
          </svg>
        </Tile>
        <div className="sm:mt-12">
          <Arrow />
        </div>
        <Tile title={t.device.title} text={t.device.text}>
          <svg viewBox="0 0 128 96" aria-hidden="true">
            <rect x="18" y="12" width="92" height="60" rx="6" fill={INK} />
            <rect x="24" y="18" width="80" height="48" rx="3" fill={C.white} />
            <path d="M8 76h112l-8 8H16z" fill={C.slate} />
            <g className="scroll-spin">
              <circle cx="50" cy="42" r="11" fill="none" stroke={C.muted} strokeWidth="5" strokeDasharray="4.3 3" />
              <circle cx="50" cy="42" r="5" fill={C.muted} />
            </g>
            <path d="M82 26l14 5v9c0 9-6 15-14 18-8-3-14-9-14-18v-9z" fill={C.green} />
            <rect x="76" y="38" width="12" height="9" rx="2" fill={C.white} />
            <path d="M78.5 38v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke={C.white} strokeWidth="2" />
          </svg>
        </Tile>
        <div className="sm:mt-12">
          <Arrow />
        </div>
        <Tile title={t.ready.title} text={t.ready.text}>
          <svg viewBox="0 0 128 96" aria-hidden="true">
            <rect x="30" y="10" width="68" height="78" rx="8" fill={C.white} stroke={C.slate} strokeWidth="2" />
            <rect x="40" y="24" width="48" height="5" rx="2.5" fill={C.line} />
            <rect x="40" y="35" width="36" height="5" rx="2.5" fill={C.line} />
            <rect x="40" y="46" width="42" height="5" rx="2.5" fill={C.line} />
            <circle cx="92" cy="70" r="16" fill={C.green} />
            <path d="M85 70l5 5 9-10" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Tile>
      </div>
      <div className="mx-auto flex max-w-md items-center gap-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3">
        <svg viewBox="0 0 64 56" className="h-12 w-14 shrink-0" aria-hidden="true">
          <rect x="10" y="6" width="40" height="12" rx="3" fill={C.white} stroke={C.slate} strokeWidth="2" />
          <rect x="10" y="22" width="40" height="12" rx="3" fill={C.white} stroke={C.slate} strokeWidth="2" />
          <rect x="10" y="38" width="40" height="12" rx="3" fill={C.white} stroke={C.slate} strokeWidth="2" />
          <circle cx="44" cy="12" r="2" fill={C.slate} />
          <circle cx="44" cy="28" r="2" fill={C.slate} />
          <circle cx="44" cy="44" r="2" fill={C.slate} />
          <path d="M6 4l52 48M58 4L6 52" stroke={C.red} strokeWidth="5" strokeLinecap="round" />
        </svg>
        <p className="text-sm text-fg">
          <span className="font-semibold">{t.serversStrong}</span> {t.serversText}
        </p>
      </div>
    </div>
  );
}
