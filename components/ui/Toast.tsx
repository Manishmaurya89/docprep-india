"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { Tone } from "./Badge";
import { IconButton } from "./Button";
import { cn } from "./cn";
import { Icon } from "./icons";

interface ToastItem {
  id: number;
  tone: Exclude<Tone, "neutral" | "accent">;
  message: string;
}

interface ToastApi {
  notify: (message: string, tone?: ToastItem["tone"]) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Transient notifications in a polite live region. Important errors are also shown inline. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const notify = useCallback(
    (message: string, tone: ToastItem["tone"] = "success") => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface px-4 py-3 text-sm shadow-lg",
              item.tone === "danger" ? "border-danger/40" : item.tone === "warning" ? "border-warning/40" : "border-success/40",
            )}
          >
            <Icon
              name={item.tone === "success" ? "check" : "alert"}
              className={cn("mt-0.5 h-5 w-5 shrink-0", item.tone === "danger" ? "text-danger" : item.tone === "warning" ? "text-warning" : "text-success")}
            />
            <p className="flex-1 text-fg">{item.message}</p>
            <IconButton icon="x" label={t.common.dismissNotification} onClick={() => dismiss(item.id)} className="-my-1 -mr-2" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
