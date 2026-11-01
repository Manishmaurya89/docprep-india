"use client";

import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { SelectedFile } from "@/components/workspace/SelectedFile";
import { Spinner } from "@/components/ui/Progress";
import type { ProcessingError } from "@/lib/file-processing/errors";
import { formatBytes } from "@/lib/file-processing/format";
import { LIMITS } from "@/lib/file-processing/limits";
import { useI18n } from "@/lib/i18n/client";
import { type InspectedPdf, PDF_ACCEPT } from "./inspect-pdf";

export function pdfDetails(pdf: InspectedPdf, details: (pages: number, size: string) => string): string {
  return details(pdf.pageCount, formatBytes(pdf.size));
}

export function PdfInputPanel({
  pdf,
  error,
  inspecting,
  onSelect,
  onClear,
  disabled,
}: {
  pdf: InspectedPdf | null;
  error: ProcessingError | null;
  inspecting: boolean;
  onSelect: (files: File[]) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {pdf ? (
        <SelectedFile name={pdf.file.name} details={pdfDetails(pdf, t.pdf.input.details)} onRemove={onClear} disabled={disabled} />
      ) : (
        <FileDropzone
          accept={PDF_ACCEPT}
          onFiles={onSelect}
          title={t.pdf.input.title}
          description={t.pdf.input.description(formatBytes(LIMITS.pdfMaxBytes, 0))}
          disabled={disabled || inspecting}
          inputTestId="pdf-input"
          art={<DocumentArt type="other" className="h-16 w-16" />}
        />
      )}
      {inspecting ? (
        <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner className="h-4 w-4" /> {t.pdf.input.reading}
        </p>
      ) : null}
      {error ? <ErrorMessage error={error} /> : null}
    </div>
  );
}
