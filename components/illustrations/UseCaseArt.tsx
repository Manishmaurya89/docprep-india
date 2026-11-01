import { INK, PALETTE as C } from "./palette";

export type UseCase = "exams" | "banking" | "passport" | "admissions" | "insurance" | "office";

const BACKGROUND: Record<UseCase, string> = {
  exams: C.amberSoft,
  banking: C.bluePale,
  passport: C.greenSoft,
  admissions: C.bluePale,
  insurance: C.redSoft,
  office: C.amberSoft,
};

/** One recognisable scene per kind of online form, so visitors find themselves at a glance. */
export function UseCaseArt({ useCase, className = "h-20 w-30" }: { useCase: UseCase; className?: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden="true">
      <rect width="120" height="80" rx="14" fill={BACKGROUND[useCase]} />
      <Scene useCase={useCase} />
    </svg>
  );
}

function Scene({ useCase }: { useCase: UseCase }) {
  switch (useCase) {
    case "exams":
      return (
        <>
          <rect x="34" y="10" width="52" height="62" rx="5" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="48" y="6" width="24" height="9" rx="3" fill={INK} />
          <rect x="40" y="22" width="16" height="19" rx="2" fill={C.blueSoft} />
          <circle cx="48" cy="29" r="4" fill={C.skin} />
          <path d="M42 41c1-5 3-7 6-7s5 2 6 7z" fill={C.shirt} />
          <rect x="60" y="24" width="20" height="3" rx="1.5" fill={C.slate} />
          <rect x="60" y="31" width="16" height="3" rx="1.5" fill={C.line} />
          {[50, 60].map((y) => (
            <g key={y}>
              <circle cx="45" cy={y} r="4" fill={C.green} />
              <path d={`M43 ${y}l1.5 1.5 3-3`} fill="none" stroke={C.white} strokeWidth="1.5" strokeLinecap="round" />
              <rect x="53" y={y - 1.5} width="24" height="3" rx="1.5" fill={C.line} />
            </g>
          ))}
        </>
      );
    case "banking":
      return (
        <>
          <path d="M28 30l32-16 32 16z" fill={C.blue} />
          <rect x="30" y="30" width="60" height="5" fill={C.blue} />
          {[36, 50, 64, 78].map((x) => (
            <rect key={x} x={x - 3} y="37" width="6" height="22" rx="1" fill={C.white} stroke={C.blue} strokeWidth="1.5" />
          ))}
          <rect x="26" y="60" width="68" height="6" rx="1" fill={C.blue} />
          <circle cx="92" cy="58" r="13" fill={C.amber} stroke={C.white} strokeWidth="2" />
          <text x="92" y="63.5" textAnchor="middle" fontSize="15" fontWeight="700" fill={C.white}>
            ₹
          </text>
        </>
      );
    case "passport":
      return (
        <>
          <rect x="30" y="10" width="40" height="58" rx="4" fill={C.greenDark} />
          <circle cx="50" cy="34" r="10" fill="none" stroke={C.amber} strokeWidth="2" />
          <path d="M50 24v20M40 34h20" stroke={C.amber} strokeWidth="1.5" />
          <rect x="38" y="52" width="24" height="3" rx="1.5" fill={C.amber} />
          <g transform="rotate(8 82 44)">
            <rect x="70" y="26" width="26" height="32" rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
            <rect x="73" y="29" width="20" height="22" fill={C.blueSoft} />
            <circle cx="83" cy="37" r="5" fill={C.skin} />
            <path d="M76 51c1-6 4-8 7-8s6 2 7 8z" fill={C.shirt} />
          </g>
        </>
      );
    case "admissions":
      return (
        <>
          <rect x="20" y="30" width="50" height="36" rx="3" fill={C.paper} stroke={C.amberDark} strokeWidth="1.5" />
          <rect x="27" y="38" width="26" height="3" rx="1.5" fill={C.slate} />
          <rect x="27" y="45" width="20" height="3" rx="1.5" fill={C.line} />
          <rect x="27" y="51" width="24" height="3" rx="1.5" fill={C.line} />
          <circle cx="58" cy="56" r="6" fill={C.amber} />
          <path d="M70 26l26-11 26 11-26 11z" transform="translate(-14 4)" fill={INK} />
          <path d="M66 34v10c0 4 7 7 16 7s16-3 16-7V34l-16 7z" transform="translate(-4 0)" fill={INK} />
          <path d="M108 30v16" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="108" cy="48" r="3" fill={C.amber} />
        </>
      );
    case "insurance":
      return (
        <>
          <rect x="24" y="16" width="38" height="50" rx="4" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="30" y="24" width="24" height="3" rx="1.5" fill={C.slate} />
          <rect x="30" y="31" width="18" height="3" rx="1.5" fill={C.line} />
          <rect x="30" y="38" width="22" height="3" rx="1.5" fill={C.line} />
          <rect x="30" y="52" width="14" height="6" rx="2" fill={C.redSoft} />
          <path d="M84 14l20 7v14c0 14-9 24-20 28-11-4-20-14-20-28V21z" fill={C.red} />
          <path d="M84 30v14M77 37h14" stroke={C.white} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case "office":
      return (
        <>
          <rect x="22" y="30" width="52" height="36" rx="5" fill={C.amberDark} />
          <path d="M38 30v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6" fill="none" stroke={C.amberDark} strokeWidth="4" />
          <rect x="22" y="42" width="52" height="4" fill={C.amber} />
          <rect x="44" y="40" width="8" height="8" rx="2" fill={C.white} />
          <rect x="76" y="14" width="26" height="36" rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <text x="89" y="44" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.red}>
            PDF
          </text>
          <rect x="80" y="21" width="18" height="2.5" rx="1.25" fill={C.line} />
          <rect x="80" y="27" width="14" height="2.5" rx="1.25" fill={C.line} />
        </>
      );
  }
}
