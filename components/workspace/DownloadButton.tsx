"use client";

import { Button, type ButtonVariant } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { downloadBlob } from "@/lib/file-processing/download";
import { errorText, toProcessingError } from "@/lib/file-processing/errors";
import { useI18n } from "@/lib/i18n/client";

export function DownloadButton({
  blob,
  filename,
  label,
  variant = "primary",
  disabled,
}: {
  blob: Blob | null;
  filename: string;
  label?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
}) {
  const { notify } = useToast();
  const { t } = useI18n();
  return (
    <Button
      icon="download"
      variant={variant}
      disabled={disabled || !blob}
      onClick={() => {
        if (!blob) return;
        try {
          downloadBlob(blob, filename);
        } catch (error) {
          const { title, hint } = errorText(toProcessingError(error), t.errors);
          notify(`${title} ${hint ?? ""}`.trim(), "danger");
        }
      }}
    >
      {label ?? t.common.download}
    </Button>
  );
}
