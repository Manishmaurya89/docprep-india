"use client";

import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Progress";
import { type ProcessingError, errorText } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";
import type { PdfJsDocument } from "@/lib/file-processing/pdf/pdfjs";

/** Responsive grid for page cards with loading and error states for the preview document. */
export function PageGrid({
  doc,
  loading,
  error,
  children,
  label,
}: {
  doc: PdfJsDocument | null;
  loading: boolean;
  error: ProcessingError | null;
  children: (doc: PdfJsDocument) => ReactNode;
  label: string;
}) {
  const { t } = useI18n();
  if (error) {
    return (
      <Alert tone="warning" title={t.pdf.previewsUnavailable}>
        {errorText(error, t.errors).title} {t.pdf.previewsFallback}
      </Alert>
    );
  }
  if (loading || !doc) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
        <Spinner className="h-4 w-4" /> {t.pdf.rendering}
      </p>
    );
  }
  return (
    <ul aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
      {children(doc)}
    </ul>
  );
}
