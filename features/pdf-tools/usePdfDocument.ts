"use client";

import { useEffect, useState } from "react";
import { type ProcessingError, toProcessingError } from "@/lib/file-processing/errors";
import type { PdfJsDocument } from "@/lib/file-processing/pdf/pdfjs";

/** Opens bytes with PDF.js for previews and closes the document on change/unmount. */
export function usePdfDocument(bytes: Uint8Array | null) {
  const [state, setState] = useState<{ bytes: Uint8Array; doc: PdfJsDocument | null; error: ProcessingError | null } | null>(null);

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    let opened: PdfJsDocument | null = null;
    (async () => {
      try {
        const { openPdfForRendering } = await import("@/lib/file-processing/pdf/pdfjs");
        const doc = await openPdfForRendering(bytes);
        opened = doc;
        if (cancelled) {
          void doc.loadingTask.destroy();
          return;
        }
        setState({ bytes, doc, error: null });
      } catch (error) {
        if (!cancelled) setState({ bytes, doc: null, error: toProcessingError(error) });
      }
    })();
    return () => {
      cancelled = true;
      if (opened) void opened.loadingTask.destroy();
    };
  }, [bytes]);

  const current = state && state.bytes === bytes ? state : null;
  return { doc: current?.doc ?? null, error: current?.error ?? null, loading: Boolean(bytes) && !current };
}
