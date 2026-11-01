"use client";

import { useCallback, useRef, useState } from "react";
import { type ProcessingError, toProcessingError } from "@/lib/file-processing/errors";
import { type InspectedPdf, inspectPdf } from "./inspect-pdf";

export function usePdfInput(onChange?: () => void) {
  const [pdf, setPdf] = useState<InspectedPdf | null>(null);
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
        const inspected = await inspectPdf(files[0]!);
        if (current !== sequence.current) return;
        setPdf(inspected);
      } catch (caught) {
        if (current !== sequence.current) return;
        setPdf(null);
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
    setPdf(null);
    setError(null);
    setInspecting(false);
  }, [onChange]);

  return { pdf, error, inspecting, select, clear };
}
