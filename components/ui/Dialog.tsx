"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { IconButton } from "./Button";

/**
 * Modal dialog built on the native <dialog> element, which provides focus
 * trapping, Escape to close and inert background content.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descId} className="mt-1 text-sm text-fg-muted">
              {description}
            </p>
          ) : null}
        </div>
        <IconButton icon="x" label={t.common.closeDialog} onClick={onClose} />
      </div>
      {children ? <div className="px-5 py-4 text-sm text-fg-muted">{children}</div> : null}
      {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div> : null}
    </dialog>
  );
}
