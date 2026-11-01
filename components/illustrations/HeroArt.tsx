import { getMessages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { INK, PALETTE as C } from "./palette";

/**
 * Home-page scene: a large phone photo becomes an application-ready 48 KB
 * photo on the phone itself; the lock and the crossed-out cloud say the file
 * is not uploaded. Small parts drift as the page scrolls (see .float-* in
 * globals.css; still for reduced-motion users).
 */
export function HeroArt({ className, locale = "en" }: { className?: string; locale?: Locale }) {
  const t = getMessages(locale).heroArt;
  return (
    <svg viewBox="0 0 560 460" className={className} role="img" aria-labelledby="hero-art-title">
      <title id="hero-art-title">{t.title}</title>
      <circle cx="300" cy="235" r="205" fill={C.bluePale} />
      <circle cx="120" cy="395" r="9" fill={C.blueSoft} />
      <circle cx="520" cy="270" r="6" fill={C.blueSoft} />
      <circle cx="205" cy="40" r="5" fill={C.blueSoft} />

      {/* Original photo, as taken on a phone */}
      <g className="float-c">
        <g transform="rotate(-9 113 220)">
          <rect x="44" y="128" width="150" height="196" rx="14" fill={INK} opacity="0.08" />
          <rect x="38" y="122" width="150" height="196" rx="14" fill={C.white} stroke={C.line} strokeWidth="2" />
          <rect x="52" y="136" width="122" height="132" rx="8" fill={C.blueSoft} />
          <path d="M71 268c4-34 22-46 42-46s38 12 42 46z" fill={C.shirt} />
          <circle cx="113" cy="190" r="24" fill={C.skin} />
          <path d="M89 186c0-18 11-28 24-28s24 10 24 28c-6-9-14-13-24-13s-18 4-24 13z" fill={C.hair} />
          <rect x="62" y="280" width="102" height="26" rx="13" fill={C.redSoft} />
          <text x="113" y="298" textAnchor="middle" fontSize="14" fontWeight="700" fill={C.red}>
            3.4 MB
          </text>
        </g>
      </g>

      {/* Arrow into the phone */}
      <path d="M198 238c14-2 22-2 30 0" fill="none" stroke={C.blue} strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />
      <path d="M224 230l9 8-9 8" fill="none" stroke={C.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Phone with the prepared photo */}
      <rect x="242" y="48" width="196" height="380" rx="34" fill={INK} opacity="0.1" />
      <rect x="236" y="40" width="196" height="380" rx="34" fill={INK} />
      <rect x="248" y="56" width="172" height="348" rx="24" fill={C.white} />
      <rect x="314" y="64" width="40" height="8" rx="4" fill={INK} />
      <text x="334" y="96" textAnchor="middle" fontSize="12" fill={C.muted}>
        {t.photo}
      </text>
      <rect x="287" y="108" width="94" height="108" rx="4" fill={C.blueSoft} />
      <path d="M300 216c3-26 17-35 34-35s31 9 34 35z" fill={C.shirt} />
      <circle cx="334" cy="152" r="18" fill={C.skin} />
      <path d="M316 149c0-14 8-21 18-21s18 7 18 21c-5-7-11-10-18-10s-13 3-18 10z" fill={C.hair} />
      <g fill="none" stroke={C.blue} strokeWidth="3" strokeLinecap="round">
        <path d="M281 116v-14h14M373 102h14v14M387 208v14h-14M295 222h-14v-14" />
      </g>
      <rect x="272" y="236" width="124" height="30" rx="15" fill={C.greenSoft} />
      <circle cx="290" cy="251" r="9" fill={C.green} />
      <path d="M286 251l3 3 5-6" fill="none" stroke={C.white} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="344" y="256" textAnchor="middle" fontSize="14" fontWeight="700" fill={C.greenDark}>
        48 KB
      </text>
      <rect x="272" y="282" width="124" height="8" rx="4" fill={C.line} />
      <rect x="272" y="298" width="88" height="8" rx="4" fill={C.line} />
      <rect x="272" y="320" width="124" height="8" rx="4" fill={C.green} />
      <rect x="272" y="344" width="124" height="34" rx="10" fill={C.blue} />
      <path d="M296 355v10m-4-4 4 4 4-4" fill="none" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="342" y="366" textAnchor="middle" fontSize="13" fontWeight="600" fill={C.white}>
        {t.download}
      </text>

      {/* "Stays on your device" */}
      <g className="float-a">
        <path d="M478 66l44 16v34c0 31-20 53-44 63-24-10-44-32-44-63V82z" fill={C.green} />
        <rect x="464" y="116" width="28" height="22" rx="4" fill={C.white} />
        <path d="M469 116v-7a9 9 0 0 1 18 0v7" fill="none" stroke={C.white} strokeWidth="4" />
        <rect x="428" y="192" width="100" height="24" rx="12" fill={C.white} stroke={C.greenLine} strokeWidth="2" />
        <text x="478" y="208" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.greenDark}>
          {t.onDevice}
        </text>
      </g>

      {/* "Not uploaded" */}
      <g className="float-b">
        <g transform="translate(-24 -18)">
          <path d="M74 84a18 18 0 0 1 3-35 24 24 0 0 1 46-5 17 17 0 0 1 8 33z" fill={C.white} stroke={C.slate} strokeWidth="3" strokeLinejoin="round" />
          <path d="M70 34l64 56" stroke={C.red} strokeWidth="5" strokeLinecap="round" />
          <rect x="142" y="52" width="88" height="22" rx="11" fill={C.redSoft} />
          <text x="186" y="67" textAnchor="middle" fontSize="11" fontWeight="700" fill={C.red}>
            {t.noUpload}
          </text>
        </g>
      </g>

      {/* Signature on paper */}
      <g className="float-b">
        <g transform="rotate(7 470 372)">
          <rect x="400" y="338" width="140" height="66" rx="10" fill={C.white} stroke={C.line} strokeWidth="2" />
          <path
            d="M414 384c10-24 18-24 22-6s12-26 20-10 10 6 16-6 14 10 22 0 10-4 16 0"
            fill="none"
            stroke={C.ink}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M414 394h112" stroke={C.line} strokeWidth="2" />
        </g>
      </g>

      <g className="float-a">
        <circle cx="212" cy="380" r="17" fill={C.greenSoft} stroke={C.green} strokeWidth="2" />
        <path d="M205 380l5 5 9-10" fill="none" stroke={C.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
