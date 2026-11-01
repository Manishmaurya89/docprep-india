"use client";

import { type DragEvent, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n/client";

/**
 * File picker with drag-and-drop. The real <input type="file"> stays in the
 * accessibility tree (visually hidden), so keyboard and screen-reader users
 * get the native file chooser. Files are only read locally.
 */
export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  title,
  description,
  disabled,
  compact = false,
  inputTestId,
  art,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  description?: string;
  disabled?: boolean;
  compact?: boolean;
  inputTestId?: string;
  /** Picture of what to choose (photo, PDF…), shown above the title when not compact. */
  art?: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <label
      htmlFor={id}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus",
        compact ? "px-4 py-5" : "px-6 py-12 sm:py-14",
        dragging ? "border-accent bg-accent-soft" : "border-border-strong bg-surface hover:border-accent/60 hover:bg-surface-muted",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        data-testid={inputTestId}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Reset so selecting the same file again still fires a change event.
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      {art && !compact ? <span className="mb-1">{art}</span> : null}
      <span className={cn("inline-flex items-center gap-2 rounded-full bg-accent font-medium text-accent-fg shadow-card", compact ? "px-3 py-1 text-sm" : "px-5 py-2 text-sm")} aria-hidden="true">
        <Icon name="upload" className="h-4 w-4" />
        {multiple ? t.dropzone.chooseFiles : t.dropzone.chooseFile}
      </span>
      <span className={cn("font-medium text-fg", compact ? "text-sm" : "text-base")}>{title}</span>
      {description ? <span className="max-w-md text-sm text-fg-subtle">{description}</span> : null}
      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
        <Icon name="lock" className="h-3.5 w-3.5" />
        {t.dropzone.local}
      </span>
    </label>
  );
}
