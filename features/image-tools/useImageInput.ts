"use client";

import { useCallback, useRef, useState } from "react";
import { type ProcessingError, toProcessingError } from "@/lib/file-processing/errors";
import { type InspectedImage, inspectImageFile } from "@/lib/file-processing/inspect";

/**
 * Holds the selected image and its validated properties. Selecting a new file
 * while a previous one is still being inspected discards the older result.
 */
export function useImageInput(onChange?: () => void) {
  const [image, setImage] = useState<InspectedImage | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const sequence = useRef(0);

  const select = useCallback(
    async (files: File[]) => {
      const current = ++sequence.current;
      onChange?.();
      setError(null);
      setInspecting(true);
      try {
        const inspected = await inspectImageFile(files[0]);
        if (current !== sequence.current) return;
        setImage(inspected);
      } catch (caught) {
        if (current !== sequence.current) return;
        setImage(null);
        setError(toProcessingError(caught));
      } finally {
        if (current === sequence.current) setInspecting(false);
      }
    },
    [onChange],
  );

  const clear = useCallback(() => {
    sequence.current++;
    onChange?.();
    setImage(null);
    setError(null);
    setInspecting(false);
  }, [onChange]);

  return { image, error, inspecting, select, clear };
}
