"use client";

import { useEffect, useState } from "react";

/**
 * Returns an object URL for a Blob, revoked when the Blob changes or the
 * component unmounts. Created inside the effect so React Strict Mode's
 * mount/unmount/mount cycle never leaves a revoked URL in use.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // Subscribing to an external resource: the state mirrors the URL we own.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return blob && entry?.blob === blob ? entry.url : null;
}
