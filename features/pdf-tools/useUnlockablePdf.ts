"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProcessingError, detail, toProcessingError } from "@/lib/file-processing/errors";
import { assertPdfFile } from "@/lib/file-processing/inspect";
import type { PdfJsDocument } from "@/lib/file-processing/pdf/pdfjs";

export interface OpenedPdf {
  id: string;
  file: File;
  doc: PdfJsDocument;
  pageCount: number;
  /** Opened with a password the user typed. */
  unlocked: boolean;
}

export interface LockedPdf {
  file: File;
  /** A password was tried and was wrong. */
  wrongPassword: boolean;
}

let counter = 0;

/**
 * Opens a PDF with PDF.js for rendering, asking for a password when the file
 * needs one. The password is passed straight to PDF.js in this browser and is
 * not kept here. The open document is closed on change and unmount.
 */
export function useUnlockablePdf(onChange?: () => void) {
  const [pdf, setPdf] = useState<OpenedPdf | null>(null);
  const [locked, setLocked] = useState<LockedPdf | null>(null);
  const [error, setError] = useState<ProcessingError | null>(null);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const openDoc = useRef<PdfJsDocument | null>(null);
  const lockedBytes = useRef<Uint8Array | null>(null);

  const replaceDoc = useCallback((doc: PdfJsDocument | null) => {
    const previous = openDoc.current;
    openDoc.current = doc;
    if (previous && previous !== doc) void previous.loadingTask.destroy();
  }, []);

  useEffect(
    () => () => {
      sequence.current++;
      void openDoc.current?.loadingTask.destroy();
      openDoc.current = null;
      lockedBytes.current = null;
    },
    [],
  );

  const attempt = useCallback(
    async (file: File, bytes: Uint8Array, password: string | undefined, current: number) => {
      const { openPdfForRendering, pdfPasswordProblem } = await import("@/lib/file-processing/pdf/pdfjs");
      try {
        const doc = await openPdfForRendering(bytes, password === undefined ? {} : { password });
        if (current !== sequence.current) {
          void doc.loadingTask.destroy();
          return;
        }
        if (doc.numPages < 1) {
          void doc.loadingTask.destroy();
          throw new ProcessingError("pdf-malformed", detail("pdfNoPages", { name: file.name }));
        }
        replaceDoc(doc);
        lockedBytes.current = null;
        setLocked(null);
        setPdf({ id: `pdf-image-${++counter}`, file, doc, pageCount: doc.numPages, unlocked: password !== undefined });
      } catch (caught) {
        if (current !== sequence.current) return;
        const problem = pdfPasswordProblem(caught);
        if (problem) {
          lockedBytes.current = bytes;
          setLocked({ file, wrongPassword: password !== undefined && problem === "incorrect" });
          return;
        }
        lockedBytes.current = null;
        setLocked(null);
        setError(toProcessingError(caught));
      }
    },
    [replaceDoc],
  );

  const select = useCallback(
    async (files: File[]) => {
      const current = ++sequence.current;
      const file = files[0];
      onChange?.();
      replaceDoc(null);
      lockedBytes.current = null;
      setPdf(null);
      setLocked(null);
      setError(null);
      setBusy(true);
      try {
        await assertPdfFile(file);
        const bytes = new Uint8Array(await file!.arrayBuffer());
        if (current !== sequence.current) return;
        await attempt(file!, bytes, undefined, current);
      } catch (caught) {
        if (current === sequence.current) setError(toProcessingError(caught));
      } finally {
        if (current === sequence.current) setBusy(false);
      }
    },
    [attempt, onChange, replaceDoc],
  );

  const unlock = useCallback(
    async (password: string) => {
      const bytes = lockedBytes.current;
      if (!locked || !bytes) return;
      const current = ++sequence.current;
      setBusy(true);
      try {
        await attempt(locked.file, bytes, password, current);
      } finally {
        if (current === sequence.current) setBusy(false);
      }
    },
    [attempt, locked],
  );

  const clear = useCallback(() => {
    sequence.current++;
    onChange?.();
    replaceDoc(null);
    lockedBytes.current = null;
    setPdf(null);
    setLocked(null);
    setError(null);
    setBusy(false);
  }, [onChange, replaceDoc]);

  return { pdf, locked, error, busy, select, unlock, clear };
}
