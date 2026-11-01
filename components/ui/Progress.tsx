import { cn } from "./cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("animate-spin motion-reduce:animate-none", className ?? "h-5 w-5")} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Determinate only when real progress is known (e.g. pages done / total).
 * Otherwise shows a spinner with a text status; no fake percentages.
 */
/** `valueText` is the spoken progress ("3 of 5"), in the page language. */
export function ProgressBar({ value, max, label, valueText }: { value: number; max: number; label: string; valueText?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText ?? `${value} of ${max}`}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
