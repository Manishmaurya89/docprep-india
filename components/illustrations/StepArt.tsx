import { INK, PALETTE as C } from "./palette";

/** Three small scenes for "How it works": choose → prepared on your phone → download. */

export function ChooseArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-auto w-full" aria-hidden="true">
      <circle cx="80" cy="62" r="52" fill={C.bluePale} />
      <path d="M30 44h30l8 8h52a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z" fill={C.amberDark} />
      <g transform="rotate(-8 78 48)">
        <rect x="50" y="22" width="56" height="48" rx="6" fill={C.white} stroke={C.line} strokeWidth="2" />
        <circle cx="92" cy="34" r="5" fill={C.amber} />
        <path d="M56 64l14-16 10 10 8-6 12 12z" fill={C.blue} opacity="0.75" />
      </g>
      <path d="M30 62h96a6 6 0 0 1 6 7l-6 33a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6z" fill={C.amber} />
      <g className="float-b">
        <circle cx="128" cy="28" r="14" fill={C.blue} />
        <path d="M128 36V21m-6 6 6-6 6 6" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function PrepareArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-auto w-full" aria-hidden="true">
      <circle cx="80" cy="62" r="52" fill={C.bluePale} />
      <rect x="52" y="12" width="56" height="98" rx="11" fill={INK} />
      <rect x="57" y="20" width="46" height="82" rx="7" fill={C.white} />
      <rect x="64" y="30" width="32" height="38" rx="2" fill={C.blueSoft} />
      <path d="M69 68c1-10 6-14 11-14s10 4 11 14z" fill={C.shirt} />
      <circle cx="80" cy="45" r="7" fill={C.skin} />
      <path d="M61 34v-6h6M93 28h6v6M99 64v6h-6M67 70h-6v-6" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" />
      <rect x="64" y="78" width="32" height="6" rx="3" fill={C.green} />
      <rect x="64" y="89" width="22" height="5" rx="2.5" fill={C.line} />
      <g className="scroll-spin">
        <circle cx="124" cy="40" r="12" fill="none" stroke={C.muted} strokeWidth="6" strokeDasharray="4.7 3.2" />
        <circle cx="124" cy="40" r="7" fill={C.muted} />
        <circle cx="124" cy="40" r="3" fill={C.bluePale} />
      </g>
      <g className="float-a">
        <path d="M36 70l14 5v10c0 9-6 15-14 18-8-3-14-9-14-18V75z" fill={C.green} />
        <path d="M30 86l4 4 8-8" fill="none" stroke={C.white} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function DownloadArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-auto w-full" aria-hidden="true">
      <circle cx="80" cy="62" r="52" fill={C.bluePale} />
      <path d="M56 8h34l16 16v52a6 6 0 0 1-6 6H56a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill={C.white} stroke={C.slate} strokeWidth="2" />
      <path d="M90 8v16h16" fill={C.line} stroke={C.slate} strokeWidth="2" strokeLinejoin="round" />
      <rect x="60" y="34" width="36" height="5" rx="2.5" fill={C.line} />
      <rect x="60" y="45" width="28" height="5" rx="2.5" fill={C.line} />
      <rect x="60" y="56" width="32" height="5" rx="2.5" fill={C.line} />
      <circle cx="102" cy="70" r="15" fill={C.green} />
      <path d="M95 70l5 5 9-10" fill="none" stroke={C.white} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g className="float-b">
        <path d="M80 86v16m-7-7 7 7 7-7" fill="none" stroke={C.blue} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M44 100v10h72v-10" fill="none" stroke={C.blue} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
