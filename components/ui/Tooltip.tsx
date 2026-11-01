"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icons";

/**
 * Accessible info tip: a real button that reveals text on hover, focus or
 * tap. Escape closes it. The text is also exposed via aria-describedby.
 */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <span ref={wrapper} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle hover:text-fg"
      >
        <Icon name="help" className="h-4 w-4" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={
          open
            ? "absolute top-full right-0 z-30 mt-1 w-64 rounded-md border border-border bg-surface p-3 text-xs leading-relaxed font-normal text-fg-muted shadow-lg"
            : "sr-only"
        }
      >
        {children}
      </span>
    </span>
  );
}
