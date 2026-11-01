"use client";

import { cn } from "@/components/ui/cn";
import { useObjectUrl } from "./hooks/useObjectUrl";

/** Shows a Blob as an image over a checkerboard (so transparency is visible). */
export function ImagePreview({
  blob,
  alt,
  caption,
  className,
  maxHeight = "20rem",
  onError,
}: {
  blob: Blob | null;
  alt: string;
  caption?: string;
  className?: string;
  maxHeight?: string;
  onError?: () => void;
}) {
  const url = useObjectUrl(blob);
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className="checkerboard flex items-center justify-center p-3" style={{ minHeight: "8rem" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: URLs cannot use next/image
          <img src={url} alt={alt} onError={onError} className="block h-auto max-w-full object-contain" style={{ maxHeight }} />
        ) : null}
      </div>
      {caption ? <figcaption className="tabular border-t border-border bg-surface px-3 py-2 text-xs text-fg-subtle">{caption}</figcaption> : null}
    </figure>
  );
}
