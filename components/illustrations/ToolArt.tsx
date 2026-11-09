import type { ToolIcon } from "@/lib/tools/registry";
import { INK, PALETTE as C } from "./palette";

/**
 * A small "before → after" picture for each tool, so people can tell what a
 * tool does without reading its description.
 */
export function ToolArt({ icon, className = "h-16 w-24", target }: { icon: ToolIcon; className?: string; /** Size shown as the result, e.g. "200 KB". */ target?: string }) {
  return (
    <svg viewBox="0 0 96 64" className={className} aria-hidden="true">
      <rect width="96" height="64" rx="12" fill={icon === "checklist" || icon === "id-photo" ? C.amberSoft : C.bluePale} />
      <Scene icon={icon} target={target} />
    </svg>
  );
}

const arrow = (x: number, y = 32) => (
  <path d={`M${x} ${y}h10m-4-4 4 4-4 4`} fill="none" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
);

function Photo({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="1.5" fill={C.blueSoft} />
      <circle cx={x + w * 0.7} cy={y + h * 0.32} r={Math.min(w, h) * 0.1} fill={C.amber} />
      <path d={`M${x + 3} ${y + h - 3}l${w * 0.3} ${-h * 0.35} ${w * 0.2} ${h * 0.18} ${w * 0.15} ${-h * 0.1} ${w * 0.35 - 6} ${h * 0.27}z`} fill={C.blue} opacity="0.7" />
    </>
  );
}

function Doc({ x, y, w = 22, h = 30, fill = C.white, label }: { x: number; y: number; w?: number; h?: number; fill?: string; label?: string }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={fill} stroke={C.slate} strokeWidth="1.5" />
      <rect x={x + 4} y={y + 7} width={w - 8} height="2.5" rx="1.25" fill={C.line} />
      <rect x={x + 4} y={y + 12} width={w - 11} height="2.5" rx="1.25" fill={C.line} />
      {label ? (
        <text x={x + w / 2} y={y + h - 5} textAnchor="middle" fontSize="7" fontWeight="700" fill={C.red}>
          {label}
        </text>
      ) : null}
    </>
  );
}

function Pill({ x, y, text, tone }: { x: number; y: number; text: string; tone: "red" | "green" | "blue" }) {
  const bg = tone === "red" ? C.redSoft : tone === "green" ? C.greenSoft : C.blueSoft;
  const fg = tone === "red" ? C.red : tone === "green" ? C.greenDark : C.blue;
  return (
    <>
      <rect x={x} y={y} width="30" height="13" rx="6.5" fill={bg} />
      <text x={x + 15} y={y + 9.5} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={fg}>
        {text}
      </text>
    </>
  );
}

function Scene({ icon, target }: { icon: ToolIcon; target?: string }) {
  switch (icon) {
    case "resize":
      return (
        <>
          <Photo x={10} y={12} w={34} h={40} />
          {arrow(48)}
          <Photo x={64} y={22} w={20} h={24} />
        </>
      );
    case "compress":
      return (
        <>
          <Photo x={8} y={10} w={30} h={34} />
          <Pill x={8} y={46} text="4 MB" tone="red" />
          {arrow(43, 28)}
          <Photo x={60} y={14} w={26} h={30} />
          <Pill x={58} y={46} text={target ?? "50 KB"} tone="green" />
        </>
      );
    case "crop":
      return (
        <>
          <Photo x={22} y={10} w={52} h={44} />
          <rect x="32" y="16" width="30" height="32" fill="none" stroke={C.white} strokeWidth="2" />
          <path d="M28 22v-10h10M56 12h10v10M66 42v10H56M38 52H28V42" fill="none" stroke={C.blue} strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case "convert":
      return (
        <>
          <Doc x={12} y={14} w={26} h={34} />
          <text x="25" y="42" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.amberDark}>
            PNG
          </text>
          {arrow(43)}
          <Doc x={58} y={14} w={26} h={34} />
          <text x="71" y="42" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.blue}>
            JPG
          </text>
        </>
      );
    case "id-photo":
      return (
        <>
          <rect x="30" y="8" width="36" height="44" rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="33" y="11" width="30" height="33" fill={C.blueSoft} />
          <path d="M37 44c1-9 5-12 11-12s10 3 11 12z" fill={C.shirt} />
          <circle cx="48" cy="25" r="6.5" fill={C.skin} />
          <circle cx="70" cy="48" r="9" fill={C.green} />
          <path d="M66 48l3 3 5-6" fill="none" stroke={C.white} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="48" y="60" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={C.muted}>
            200 × 230
          </text>
        </>
      );
    case "merge":
      return (
        <>
          <Doc x={8} y={8} w={18} h={22} />
          <Doc x={8} y={34} w={18} h={22} />
          <path d="M30 19c8 0 8 13 16 13M30 45c8 0 8-13 16-13" fill="none" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round" />
          {arrow(46)}
          <Doc x={62} y={14} w={24} h={36} />
        </>
      );
    case "split":
      return (
        <>
          <Doc x={8} y={14} w={24} h={36} />
          <path d="M36 32h6c8 0 8-13 16-13M42 32c8 0 8 13 16 13" fill="none" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round" />
          <Doc x={66} y={8} w={18} h={22} />
          <Doc x={66} y={34} w={18} h={22} />
        </>
      );
    case "extract":
      return (
        <>
          <Doc x={10} y={18} w={20} h={28} />
          <Doc x={16} y={14} w={20} h={28} />
          <Doc x={22} y={10} w={20} h={28} />
          {arrow(48)}
          <Doc x={64} y={16} w={22} h={30} fill={C.greenSoft} />
        </>
      );
    case "organize":
      return (
        <>
          <Doc x={18} y={6} w={16} h={22} />
          <Doc x={38} y={6} w={16} h={22} />
          <Doc x={18} y={34} w={16} h={22} fill={C.redSoft} />
          <path d="M22 41l8 8m0-8-8 8" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
          <g transform="rotate(90 46 45)">
            <Doc x={38} y={34} w={16} h={22} />
          </g>
          <path d="M66 22a12 12 0 1 1-3 16" fill="none" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M60 32l3 6 6-3" fill="none" stroke={C.blue} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case "images-pdf":
      return (
        <>
          <g transform="rotate(-8 24 30)">
            <Photo x={10} y={14} w={26} h={22} />
          </g>
          <Photo x={14} y={30} w={26} h={22} />
          {arrow(44)}
          <Doc x={60} y={12} w={26} h={38} />
          <text x="73" y="44" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.red}>
            PDF
          </text>
        </>
      );
    case "photo-bg":
      return (
        <>
          {/* A portrait on a busy background becomes the same portrait on white and on red. */}
          <rect x="6" y="10" width="30" height="40" rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="9" y="13" width="24" height="34" fill={C.blueSoft} />
          <path d="M9 30l7-9 6 6 4-4 7 7v17H9z" fill={C.green} opacity="0.55" />
          <circle cx="28" cy="18" r="2.5" fill={C.amber} />
          <path d="M12 47c1-8 4.5-11 9-11s8 3 9 11z" fill={C.shirt} />
          <circle cx="21" cy="29" r="5.5" fill={C.skin} />
          <path d="M15.5 28c0-4 2.5-6.5 5.5-6.5s5.5 2.5 5.5 6.5c-1.5-2-3.3-3-5.5-3s-4 1-5.5 3z" fill={C.hair} />
          {arrow(40)}
          <rect x="55" y="8" width="26" height="34" rx="3" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <path d="M58.5 39c1-7 3.8-9.5 7.5-9.5s6.5 2.5 7.5 9.5z" fill={C.shirt} />
          <circle cx="66" cy="23.5" r="4.8" fill={C.skin} />
          <path d="M61.2 22.6c0-3.4 2.2-5.6 4.8-5.6s4.8 2.2 4.8 5.6c-1.3-1.7-2.9-2.6-4.8-2.6s-3.5.9-4.8 2.6z" fill={C.hair} />
          <rect x="68" y="34" width="20" height="24" rx="2.5" fill={C.white} stroke={C.slate} strokeWidth="1.2" />
          <rect x="70" y="36" width="16" height="20" fill="#d62828" />
          <path d="M71.5 56c.6-4.5 2.4-6 5-6s4.4 1.5 5 6z" fill={C.shirt} />
          <circle cx="76.5" cy="46.5" r="3.2" fill={C.skin} />
          <path d="M73.3 45.9c0-2.3 1.4-3.7 3.2-3.7s3.2 1.4 3.2 3.7c-.9-1.1-1.9-1.7-3.2-1.7s-2.3.6-3.2 1.7z" fill={C.hair} />
        </>
      );
    case "pdf-image":
      return (
        <>
          <Doc x={10} y={12} w={26} h={38} />
          <text x="23" y="44" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.red}>
            PDF
          </text>
          {arrow(41)}
          <Photo x={56} y={14} w={30} h={26} />
          <Pill x={56} y={44} text="JPG" tone="blue" />
        </>
      );
    case "pdf-compress":
      return (
        <>
          <Doc x={10} y={8} w={26} h={38} />
          <text x="23" y="40" textAnchor="middle" fontSize="8" fontWeight="700" fill={C.red}>
            PDF
          </text>
          <Pill x={8} y={48} text="5 MB" tone="red" />
          {arrow(42, 26)}
          <Doc x={62} y={14} w={22} h={30} />
          <Pill x={58} y={48} text={target ?? "300 KB"} tone="green" />
        </>
      );
    case "checklist":
      return (
        <>
          <rect x="28" y="8" width="40" height="50" rx="5" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
          <rect x="38" y="4" width="20" height="8" rx="3" fill={INK} />
          {[20, 32, 44].map((y) => (
            <g key={y}>
              <circle cx="37" cy={y} r="4" fill={C.green} />
              <path d={`M35 ${y}l1.5 1.5 3-3`} fill="none" stroke={C.white} strokeWidth="1.6" strokeLinecap="round" />
              <rect x="45" y={y - 1.5} width="17" height="3" rx="1.5" fill={C.line} />
            </g>
          ))}
        </>
      );
  }
}
