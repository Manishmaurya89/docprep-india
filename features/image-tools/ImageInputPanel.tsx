"use client";

import { type ReactNode, useRef } from "react";
import { DocumentArt } from "@/components/illustrations/DocumentArt";
import { FileDropzone } from "@/components/workspace/FileDropzone";
import { ErrorMessage } from "@/components/workspace/ErrorMessage";
import { SelectedFile } from "@/components/workspace/SelectedFile";
import { Spinner } from "@/components/ui/Progress";
import { FORMAT_LABELS } from "@/lib/file-processing/detect";
import type { ProcessingError } from "@/lib/file-processing/errors";
import { formatBytes, formatDimensions } from "@/lib/file-processing/format";
import type { InspectedImage } from "@/lib/file-processing/inspect";
import { LIMITS } from "@/lib/file-processing/limits";
import { useI18n } from "@/lib/i18n/client";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export function describeImage(image: InspectedImage, transparency = "has transparency"): string {
  return `${FORMAT_LABELS[image.format]} · ${formatDimensions(image.width, image.height)} · ${formatBytes(image.size)}${image.hasAlpha ? ` · ${transparency}` : ""}`;
}

export function ImageInputPanel({
  image,
  error,
  inspecting,
  onSelect,
  onClear,
  disabled,
  title,
  art,
}: {
  image: InspectedImage | null;
  error: ProcessingError | null;
  inspecting: boolean;
  onSelect: (files: File[]) => void;
  onClear: () => void;
  disabled?: boolean;
  title?: string;
  art?: ReactNode;
}) {
  const { t } = useI18n();
  const replaceInput = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      {image ? (
        <>
          <SelectedFile
            name={image.file.name}
            details={describeImage(image, t.image.input.transparency)}
            icon="image"
            onReplace={() => replaceInput.current?.click()}
            onRemove={onClear}
            disabled={disabled}
          />
          <input
            ref={replaceInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) onSelect(files);
            }}
          />
        </>
      ) : (
        <FileDropzone
          accept={IMAGE_ACCEPT}
          onFiles={onSelect}
          title={title ?? t.image.input.title}
          description={t.image.input.description(formatBytes(LIMITS.imageMaxBytes, 0))}
          disabled={disabled || inspecting}
          inputTestId="image-input"
          art={art ?? <DocumentArt type="photograph" className="h-16 w-16" />}
        />
      )}
      {inspecting ? (
        <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
          <Spinner className="h-4 w-4" /> {t.image.input.checking}
        </p>
      ) : null}
      {error ? <ErrorMessage error={error} /> : null}
    </div>
  );
}
