import type { DocumentType } from "@/data/exam-requirements/constants";
import { INK, PALETTE as C } from "./palette";

/** Small picture of each application document, so cards can be recognised at a glance. */
export function DocumentArt({ type, live = false, className = "h-14 w-14" }: { type: DocumentType; live?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={live ? C.amberSoft : C.bluePale} />
      {live ? <LiveCamera /> : <Picture type={type} />}
    </svg>
  );
}

function LiveCamera() {
  return (
    <>
      <rect x="12" y="20" width="32" height="26" rx="5" fill={INK} />
      <path d="M44 28l10-6v22l-10-6z" fill={INK} />
      <circle cx="28" cy="33" r="8" fill={C.white} />
      <circle cx="28" cy="33" r="4" fill={C.blue} />
      <circle cx="49" cy="16" r="4" fill={C.red} />
    </>
  );
}

function Picture({ type }: { type: DocumentType }) {
  switch (type) {
    case "photograph":
      return (
        <>
          <rect x="16" y="10" width="32" height="40" rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="19" y="13" width="26" height="30" fill={C.blueSoft} />
          <path d="M22 43c1-8 5-11 10-11s9 3 10 11z" fill={C.shirt} />
          <circle cx="32" cy="25" r="6" fill={C.skin} />
          <path d="M26 24c0-5 3-7 6-7s6 2 6 7c-2-2-4-3-6-3s-4 1-6 3z" fill={C.hair} />
          <rect x="22" y="53" width="20" height="4" rx="2" fill={C.blue} />
        </>
      );
    case "signature":
      return (
        <>
          <rect x="8" y="18" width="48" height="28" rx="4" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <path d="M13 37c4-10 8-10 9-2s5-11 8-4 4 2 6-3 6 4 9 0" fill="none" stroke={C.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 41h38" stroke={C.line} strokeWidth="1.5" />
        </>
      );
    case "left-thumb-impression":
      return (
        <g fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round">
          <ellipse cx="32" cy="33" rx="5" ry="7" />
          <path d="M23 39a10 13 0 0 1 2-17 10 12 0 0 1 16 1" />
          <path d="M19 35a14 17 0 0 1 4-18 14 16 0 0 1 22 4 14 18 0 0 1 1 18" />
          <path d="M16 28a17 18 0 0 1 32-5" />
          <path d="M41 33a9 12 0 0 1-3 11" />
        </g>
      );
    case "handwritten-declaration":
      return (
        <>
          <rect x="12" y="8" width="40" height="48" rx="4" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <g fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round">
            <path d="M17 19c3-3 5 2 8-1s5 2 8-1 5 2 8-1" />
            <path d="M17 27c3-3 5 2 8-1s5 2 8-1 5 2 10-1" />
            <path d="M17 35c3-3 5 2 8-1s5 2 8-1" />
            <path d="M30 47c3-5 5-5 6 0s4-5 6-1" />
          </g>
        </>
      );
    case "category-certificate":
    case "educational-certificate":
      return (
        <>
          <rect x="8" y="12" width="48" height="36" rx="3" fill={C.paper} stroke={C.amberDark} strokeWidth="2" />
          <rect x="15" y="19" width="26" height="4" rx="2" fill={C.slate} />
          <rect x="15" y="27" width="20" height="3" rx="1.5" fill={C.line} />
          <rect x="15" y="33" width="24" height="3" rx="1.5" fill={C.line} />
          <path d="M43 40l-3 14 6-3 6 3-3-14z" fill={C.red} />
          <circle cx="46" cy="38" r="7" fill={C.amber} />
          <circle cx="46" cy="38" r="3.5" fill={C.amberSoft} />
        </>
      );
    case "identity-proof":
      return (
        <>
          <rect x="7" y="16" width="50" height="32" rx="4" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="12" y="22" width="15" height="19" rx="2" fill={C.blueSoft} />
          <circle cx="19.5" cy="29" r="4" fill={C.skin} />
          <rect x="31" y="24" width="20" height="3" rx="1.5" fill={C.slate} />
          <rect x="31" y="31" width="16" height="3" rx="1.5" fill={C.line} />
          <rect x="31" y="37" width="18" height="3" rx="1.5" fill={C.line} />
        </>
      );
    default:
      return (
        <>
          <path d="M18 8h20l10 10v36a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <path d="M38 8v10h10" fill="none" stroke={C.slate} strokeWidth="1.5" />
          <rect x="21" y="26" width="20" height="3" rx="1.5" fill={C.line} />
          <rect x="21" y="33" width="16" height="3" rx="1.5" fill={C.line} />
          <rect x="21" y="40" width="18" height="3" rx="1.5" fill={C.line} />
        </>
      );
  }
}
